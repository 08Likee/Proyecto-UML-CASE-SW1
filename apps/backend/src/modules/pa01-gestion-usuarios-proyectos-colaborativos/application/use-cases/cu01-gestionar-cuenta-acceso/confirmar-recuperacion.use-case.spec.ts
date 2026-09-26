import {
  RecuperacionCuentaRepository,
  type ActualizarContrasenaRecuperacionDatos,
} from '../../ports/persistence/recuperacion-cuenta.repository';
import { PasswordHasher } from '../../ports/security/password-hasher';
import {
  PasswordRecoveryTokenService,
  type PasswordRecoveryTokenIdentity,
} from '../../ports/security/password-recovery-token.service';
import { ContrasenasNoCoincidenError } from '../../../domain/errors/contrasenas-no-coinciden.error';
import { RecuperacionInvalidaError } from '../../../domain/errors/recuperacion-invalida.error';
import { ConfirmarRecuperacionUseCase } from './confirmar-recuperacion.use-case';

class RecuperacionCuentaRepositoryFake extends RecuperacionCuentaRepository {
  contrasenaHashActual: string | null = 'hash-actual';

  actualizado = true;

  datosActualizacion: ActualizarContrasenaRecuperacionDatos | null = null;

  async buscarContrasenaHashPorUsuarioId(
    _idUsuario: string,
  ): Promise<string | null> {
    return this.contrasenaHashActual;
  }

  async actualizarContrasenaYRevocarSesiones(
    datos: ActualizarContrasenaRecuperacionDatos,
  ): Promise<boolean> {
    this.datosActualizacion = datos;

    return this.actualizado;
  }
}

class PasswordRecoveryTokenServiceFake extends PasswordRecoveryTokenService {
  tokenValido = true;

  huellaCoincide = true;

  async generar(): Promise<string> {
    throw new Error('No implementado para esta prueba');
  }

  async verificar(): Promise<PasswordRecoveryTokenIdentity> {
    if (!this.tokenValido) {
      throw new Error('Token inválido');
    }

    return {
      usuarioId: 'usuario-1',
      contrasenaHuella: 'huella-token',
    };
  }

  coincideContrasenaActual(): boolean {
    return this.huellaCoincide;
  }
}

class PasswordHasherFake extends PasswordHasher {
  ultimaContrasena: string | null = null;

  async hash(password: string): Promise<string> {
    this.ultimaContrasena = password;

    return 'nuevo-hash-scrypt';
  }

  async verify(): Promise<boolean> {
    throw new Error('No implementado para esta prueba');
  }
}

describe('ConfirmarRecuperacionUseCase', () => {
  let repository: RecuperacionCuentaRepositoryFake;

  let tokenService: PasswordRecoveryTokenServiceFake;

  let passwordHasher: PasswordHasherFake;

  let useCase: ConfirmarRecuperacionUseCase;

  beforeEach(() => {
    repository = new RecuperacionCuentaRepositoryFake();

    tokenService = new PasswordRecoveryTokenServiceFake();

    passwordHasher = new PasswordHasherFake();

    useCase = new ConfirmarRecuperacionUseCase(
      repository,
      tokenService,
      passwordHasher,
    );
  });

  it('debe actualizar la contraseña y revocar sesiones con una recuperación válida', async () => {
    await useCase.execute({
      token: 'recovery-token',
      nuevaContrasena: 'NuevaClave123!',
      confirmacionContrasena: 'NuevaClave123!',
    });

    expect(passwordHasher.ultimaContrasena).toBe('NuevaClave123!');

    expect(repository.datosActualizacion).toMatchObject({
      idUsuario: 'usuario-1',
      contrasenaHashActual: 'hash-actual',
      nuevaContrasenaHash: 'nuevo-hash-scrypt',
    });

    expect(repository.datosActualizacion?.fechaRevocacion).toBeInstanceOf(Date);
  });

  it('debe rechazar un token inválido', async () => {
    tokenService.tokenValido = false;

    await expect(
      useCase.execute({
        token: 'token-invalido',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionInvalidaError);

    expect(repository.datosActualizacion).toBeNull();
  });

  it('debe rechazar si el usuario ya no existe', async () => {
    repository.contrasenaHashActual = null;

    await expect(
      useCase.execute({
        token: 'recovery-token',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionInvalidaError);
  });

  it('debe rechazar si la huella ya no corresponde a la contraseña actual', async () => {
    tokenService.huellaCoincide = false;

    await expect(
      useCase.execute({
        token: 'recovery-token',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionInvalidaError);

    expect(passwordHasher.ultimaContrasena).toBeNull();
  });

  it('debe rechazar si la contraseña y su confirmación no coinciden', async () => {
    await expect(
      useCase.execute({
        token: 'recovery-token',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'OtraClave123!',
      }),
    ).rejects.toBeInstanceOf(ContrasenasNoCoincidenError);

    expect(passwordHasher.ultimaContrasena).toBeNull();

    expect(repository.datosActualizacion).toBeNull();
  });

  it('debe rechazar si el hash cambió antes de completar la actualización', async () => {
    repository.actualizado = false;

    await expect(
      useCase.execute({
        token: 'recovery-token',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionInvalidaError);
  });
});
