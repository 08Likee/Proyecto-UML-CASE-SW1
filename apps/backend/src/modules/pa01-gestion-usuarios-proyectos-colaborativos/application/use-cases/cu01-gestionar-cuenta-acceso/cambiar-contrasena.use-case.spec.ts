import {
  type ActualizarPerfilDatos,
  type CrearUsuarioDatos,
  type Usuario,
} from '../../../domain/models/usuario';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { PasswordHasher } from '../../ports/security/password-hasher';
import { ContrasenaActualInvalidaError } from '../../../domain/errors/contrasena-actual-invalida.error';
import { ContrasenasNoCoincidenError } from '../../../domain/errors/contrasenas-no-coinciden.error';
import { UsuarioNoEncontradoError } from '../../../domain/errors/usuario-no-encontrado.error';
import { CambiarContrasenaUseCase } from './cambiar-contrasena.use-case';

class UsuarioRepositoryFake extends UsuarioRepository {
  usuario: Usuario | null = {
    id: 'usuario-1',
    nombre: 'Luis',
    apellido: 'Mendoza',
    correo: 'luis@example.com',
    contrasenaHash: 'hash-actual',
    fotoPerfil: null,
    estado: 'ACTIVO',
    fechaRegistro: new Date(),
    ultimaConexion: null,
  };

  actualizacion: {
    idUsuario: string;
    contrasenaHashActual: string;
    nuevaContrasenaHash: string;
  } | null = null;

  actualizarResultado = true;

  async buscarPorCorreo(): Promise<Usuario | null> {
    return this.usuario;
  }

  async buscarPorId(idUsuario: string): Promise<Usuario | null> {
    if (!this.usuario || this.usuario.id !== idUsuario) {
      return null;
    }

    return this.usuario;
  }

  async crear(_datos: CrearUsuarioDatos): Promise<Usuario> {
    throw new Error('No implementado para esta prueba');
  }

  async actualizarPerfil(
    _idUsuario: string,
    _datos: ActualizarPerfilDatos,
  ): Promise<Usuario | null> {
    throw new Error('No implementado para esta prueba');
  }

  async actualizarContrasenaSiCoincide(
    idUsuario: string,
    contrasenaHashActual: string,
    nuevaContrasenaHash: string,
  ): Promise<boolean> {
    this.actualizacion = {
      idUsuario,
      contrasenaHashActual,
      nuevaContrasenaHash,
    };

    return this.actualizarResultado;
  }

  async actualizarUltimaConexion(): Promise<void> {}
}

class PasswordHasherFake extends PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hash:${password}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return password === 'ClaveActual123!' && hash === 'hash-actual';
  }
}

describe('CambiarContrasenaUseCase', () => {
  let repository: UsuarioRepositoryFake;

  let useCase: CambiarContrasenaUseCase;

  beforeEach(() => {
    repository = new UsuarioRepositoryFake();

    useCase = new CambiarContrasenaUseCase(
      repository,
      new PasswordHasherFake(),
    );
  });

  it('debe cambiar la contraseña cuando la contraseña actual es válida', async () => {
    await useCase.execute({
      idUsuario: 'usuario-1',
      contrasenaActual: 'ClaveActual123!',
      nuevaContrasena: 'NuevaClave123!',
      confirmacionContrasena: 'NuevaClave123!',
    });

    expect(repository.actualizacion).toEqual({
      idUsuario: 'usuario-1',
      contrasenaHashActual: 'hash-actual',
      nuevaContrasenaHash: 'hash:NuevaClave123!',
    });
  });

  it('debe rechazar una contraseña actual incorrecta', async () => {
    await expect(
      useCase.execute({
        idUsuario: 'usuario-1',
        contrasenaActual: 'Incorrecta123!',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      }),
    ).rejects.toBeInstanceOf(ContrasenaActualInvalidaError);

    expect(repository.actualizacion).toBeNull();
  });

  it('debe rechazar si la nueva contraseña y su confirmación no coinciden', async () => {
    await expect(
      useCase.execute({
        idUsuario: 'usuario-1',
        contrasenaActual: 'ClaveActual123!',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'OtraClave123!',
      }),
    ).rejects.toBeInstanceOf(ContrasenasNoCoincidenError);

    expect(repository.actualizacion).toBeNull();
  });

  it('debe rechazar un usuario inexistente', async () => {
    repository.usuario = null;

    await expect(
      useCase.execute({
        idUsuario: 'usuario-inexistente',
        contrasenaActual: 'ClaveActual123!',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      }),
    ).rejects.toBeInstanceOf(UsuarioNoEncontradoError);
  });

  it('debe rechazar el cambio si el hash fue modificado concurrentemente', async () => {
    repository.actualizarResultado = false;

    await expect(
      useCase.execute({
        idUsuario: 'usuario-1',
        contrasenaActual: 'ClaveActual123!',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      }),
    ).rejects.toBeInstanceOf(ContrasenaActualInvalidaError);
  });
});
