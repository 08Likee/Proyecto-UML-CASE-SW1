import {
  type CrearUsuarioDatos,
  type Usuario,
} from '../../../domain/models/usuario';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import {
  PasswordRecoveryNotifier,
  type PasswordRecoveryNotification,
} from '../../ports/notifications/password-recovery-notifier';
import {
  PasswordRecoveryTokenService,
  type PasswordRecoveryTokenIdentity,
} from '../../ports/security/password-recovery-token.service';
import { SolicitarRecuperacionUseCase } from './solicitar-recuperacion.use-case';

class UsuarioRepositoryFake extends UsuarioRepository {
  usuario: Usuario | null = null;

  correoBuscado: string | null = null;

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    this.correoBuscado = correo;

    return this.usuario;
  }

  async crear(_datos: CrearUsuarioDatos): Promise<Usuario> {
    throw new Error('No implementado para esta prueba');
  }

  async actualizarUltimaConexion(
    _idUsuario: string,
    _fecha: Date,
  ): Promise<void> {}
}

class PasswordRecoveryTokenServiceFake extends PasswordRecoveryTokenService {
  datosGenerados: {
    usuarioId: string;
    contrasenaHash: string;
  } | null = null;

  async generar(usuarioId: string, contrasenaHash: string): Promise<string> {
    this.datosGenerados = {
      usuarioId,
      contrasenaHash,
    };

    return 'recovery-token';
  }

  async verificar(_token: string): Promise<PasswordRecoveryTokenIdentity> {
    throw new Error('No implementado para esta prueba');
  }

  coincideContrasenaActual(): boolean {
    return true;
  }
}

class PasswordRecoveryNotifierFake extends PasswordRecoveryNotifier {
  ultimaNotificacion: PasswordRecoveryNotification | null = null;

  async enviar(datos: PasswordRecoveryNotification): Promise<void> {
    this.ultimaNotificacion = datos;
  }
}

describe('SolicitarRecuperacionUseCase', () => {
  let usuarioRepository: UsuarioRepositoryFake;
  let tokenService: PasswordRecoveryTokenServiceFake;
  let notifier: PasswordRecoveryNotifierFake;
  let useCase: SolicitarRecuperacionUseCase;

  const usuario: Usuario = {
    id: 'usuario-1',
    nombre: 'Luis',
    apellido: 'Mendoza',
    correo: 'luis@example.com',
    contrasenaHash: 'hash-scrypt-actual',
    fotoPerfil: null,
    estado: 'ACTIVO',
    fechaRegistro: new Date(),
    ultimaConexion: null,
  };

  beforeEach(() => {
    usuarioRepository = new UsuarioRepositoryFake();

    tokenService = new PasswordRecoveryTokenServiceFake();

    notifier = new PasswordRecoveryNotifierFake();

    useCase = new SolicitarRecuperacionUseCase(
      usuarioRepository,
      tokenService,
      notifier,
    );
  });

  it('debe iniciar la recuperación para una cuenta existente', async () => {
    usuarioRepository.usuario = usuario;

    await useCase.execute({
      correo: ' LUIS@EXAMPLE.COM ',
    });

    expect(usuarioRepository.correoBuscado).toBe('luis@example.com');

    expect(tokenService.datosGenerados).toEqual({
      usuarioId: 'usuario-1',
      contrasenaHash: 'hash-scrypt-actual',
    });

    expect(notifier.ultimaNotificacion).toEqual({
      correo: 'luis@example.com',
      nombre: 'Luis',
      token: 'recovery-token',
    });
  });

  it('no debe revelar ni notificar cuando la cuenta no existe', async () => {
    usuarioRepository.usuario = null;

    await expect(
      useCase.execute({
        correo: 'noexiste@example.com',
      }),
    ).resolves.toBeUndefined();

    expect(tokenService.datosGenerados).toBeNull();

    expect(notifier.ultimaNotificacion).toBeNull();
  });
});
