import {
  type ActualizarPerfilDatos,
  type CrearUsuarioDatos,
  type Usuario,
} from '../../../domain/models/usuario';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { UsuarioNoEncontradoError } from '../../../domain/errors/usuario-no-encontrado.error';
import { ModificarPerfilUseCase } from './modificar-perfil.use-case';

class UsuarioRepositoryFake extends UsuarioRepository {
  usuario: Usuario | null = {
    id: 'usuario-1',
    nombre: 'Luis',
    apellido: 'Mendoza',
    correo: 'luis@example.com',
    contrasenaHash: 'hash-scrypt',
    fotoPerfil: 'https://example.com/foto-anterior.png',
    estado: 'ACTIVO',
    fechaRegistro: new Date(),
    ultimaConexion: null,
  };

  datosPerfil: ActualizarPerfilDatos | null = null;

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
    idUsuario: string,
    datos: ActualizarPerfilDatos,
  ): Promise<Usuario | null> {
    this.datosPerfil = datos;

    if (!this.usuario || this.usuario.id !== idUsuario) {
      return null;
    }

    this.usuario = {
      ...this.usuario,
      ...datos,
    };

    return this.usuario;
  }

  async actualizarUltimaConexion(): Promise<void> {}
}

describe('ModificarPerfilUseCase', () => {
  let repository: UsuarioRepositoryFake;

  let useCase: ModificarPerfilUseCase;

  beforeEach(() => {
    repository = new UsuarioRepositoryFake();

    useCase = new ModificarPerfilUseCase(repository);
  });

  it('debe modificar los datos permitidos del perfil', async () => {
    const resultado = await useCase.execute({
      idUsuario: 'usuario-1',
      nombre: ' Luis Alberto ',
      apellido: ' Mendoza Rojas ',
      fotoPerfil: ' https://example.com/nueva.png ',
    });

    expect(repository.datosPerfil).toEqual({
      nombre: 'Luis Alberto',
      apellido: 'Mendoza Rojas',
      fotoPerfil: 'https://example.com/nueva.png',
    });

    expect(resultado).toEqual({
      id: 'usuario-1',
      nombre: 'Luis Alberto',
      apellido: 'Mendoza Rojas',
      correo: 'luis@example.com',
      fotoPerfil: 'https://example.com/nueva.png',
    });

    expect(resultado).not.toHaveProperty('contrasenaHash');
  });

  it('debe conservar la foto actual si no se proporciona una nueva', async () => {
    const resultado = await useCase.execute({
      idUsuario: 'usuario-1',
      nombre: 'Luis',
      apellido: 'Mendoza',
    });

    expect(resultado.fotoPerfil).toBe('https://example.com/foto-anterior.png');

    expect(repository.datosPerfil?.fotoPerfil).toBe(
      'https://example.com/foto-anterior.png',
    );
  });

  it('debe permitir eliminar la foto del perfil', async () => {
    const resultado = await useCase.execute({
      idUsuario: 'usuario-1',
      nombre: 'Luis',
      apellido: 'Mendoza',
      fotoPerfil: '',
    });

    expect(resultado.fotoPerfil).toBeNull();

    expect(repository.datosPerfil?.fotoPerfil).toBeNull();
  });

  it('debe rechazar un usuario inexistente', async () => {
    repository.usuario = null;

    await expect(
      useCase.execute({
        idUsuario: 'usuario-inexistente',
        nombre: 'Luis',
        apellido: 'Mendoza',
      }),
    ).rejects.toBeInstanceOf(UsuarioNoEncontradoError);

    expect(repository.datosPerfil).toBeNull();
  });
});
