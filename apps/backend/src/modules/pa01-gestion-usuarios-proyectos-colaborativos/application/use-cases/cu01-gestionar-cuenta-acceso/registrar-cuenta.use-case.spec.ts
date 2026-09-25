import { PasswordHasher } from '../../ports/security/password-hasher';
import { CorreoYaRegistradoError } from '../../../domain/errors/correo-ya-registrado.error';
import {
  type CrearUsuarioDatos,
  type Usuario,
} from '../../../domain/models/usuario';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { RegistrarCuentaUseCase } from './registrar-cuenta.use-case';

class UsuarioRepositoryFake extends UsuarioRepository {
  usuarioExistente: Usuario | null = null;
  ultimoUsuarioCreado: CrearUsuarioDatos | null = null;

  async buscarPorCorreo(): Promise<Usuario | null> {
    return this.usuarioExistente;
  }

  async crear(datos: CrearUsuarioDatos): Promise<Usuario> {
    this.ultimoUsuarioCreado = datos;

    return {
      id: 'usuario-1',
      nombre: datos.nombre,
      apellido: datos.apellido,
      correo: datos.correo,
      contrasenaHash: datos.contrasenaHash,
      fotoPerfil: datos.fotoPerfil ?? null,
      estado: 'ACTIVO',
      fechaRegistro: new Date('2026-09-25T12:00:00Z'),
      ultimaConexion: null,
    };
  }
}

class PasswordHasherFake extends PasswordHasher {
  ultimoPassword: string | null = null;

  async hash(password: string): Promise<string> {
    this.ultimoPassword = password;
    return 'hash-seguro';
  }

  async verify(): Promise<boolean> {
    return true;
  }
}

describe('RegistrarCuentaUseCase', () => {
  let usuarioRepository: UsuarioRepositoryFake;
  let passwordHasher: PasswordHasherFake;
  let useCase: RegistrarCuentaUseCase;

  beforeEach(() => {
    usuarioRepository = new UsuarioRepositoryFake();
    passwordHasher = new PasswordHasherFake();

    useCase = new RegistrarCuentaUseCase(usuarioRepository, passwordHasher);
  });

  it('debe registrar una cuenta correctamente', async () => {
    const result = await useCase.execute({
      nombre: ' Luis ',
      apellido: ' Mendoza ',
      correo: ' LUIS@Ejemplo.com ',
      contrasena: 'ClaveSegura123!',
    });

    expect(passwordHasher.ultimoPassword).toBe('ClaveSegura123!');

    expect(usuarioRepository.ultimoUsuarioCreado).toEqual({
      nombre: 'Luis',
      apellido: 'Mendoza',
      correo: 'luis@ejemplo.com',
      contrasenaHash: 'hash-seguro',
    });

    expect(result).toEqual({
      id: 'usuario-1',
      nombre: 'Luis',
      apellido: 'Mendoza',
      correo: 'luis@ejemplo.com',
      fotoPerfil: null,
      estado: 'ACTIVO',
      fechaRegistro: new Date('2026-09-25T12:00:00Z'),
    });
  });

  it('debe rechazar un correo ya registrado', async () => {
    usuarioRepository.usuarioExistente = {
      id: 'usuario-existente',
      nombre: 'Luis',
      apellido: 'Mendoza',
      correo: 'luis@ejemplo.com',
      contrasenaHash: 'hash',
      fotoPerfil: null,
      estado: 'ACTIVO',
      fechaRegistro: new Date(),
      ultimaConexion: null,
    };

    await expect(
      useCase.execute({
        nombre: 'Otro',
        apellido: 'Usuario',
        correo: 'LUIS@EJEMPLO.COM',
        contrasena: 'ClaveSegura123!',
      }),
    ).rejects.toBeInstanceOf(CorreoYaRegistradoError);

    expect(usuarioRepository.ultimoUsuarioCreado).toBeNull();
  });
});
