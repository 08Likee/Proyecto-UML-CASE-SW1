import {
  type ActualizarPerfilDatos,
  type CrearUsuarioDatos,
  type Usuario,
} from '../../../domain/models/usuario';
import { UsuarioNoEncontradoError } from '../../../domain/errors/usuario-no-encontrado.error';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { ObtenerPerfilUseCase } from './obtener-perfil.use-case';

class UsuarioRepositoryFake extends UsuarioRepository {
  usuario: Usuario | null = {
    id: 'usuario-1',
    nombre: 'Luis',
    apellido: 'Mendoza',
    correo: 'luis@example.com',
    contrasenaHash: 'hash-scrypt',
    fotoPerfil: 'https://example.com/perfil.png',
    estado: 'ACTIVO',
    fechaRegistro: new Date(),
    ultimaConexion: null,
  };

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

  async actualizarUltimaConexion(): Promise<void> {}
}

describe('ObtenerPerfilUseCase', () => {
  let repository: UsuarioRepositoryFake;

  let useCase: ObtenerPerfilUseCase;

  beforeEach(() => {
    repository = new UsuarioRepositoryFake();

    useCase = new ObtenerPerfilUseCase(repository);
  });

  it('debe devolver la información pública del perfil', async () => {
    const resultado = await useCase.execute('usuario-1');

    expect(resultado).toEqual({
      id: 'usuario-1',
      nombre: 'Luis',
      apellido: 'Mendoza',
      correo: 'luis@example.com',
      fotoPerfil: 'https://example.com/perfil.png',
    });

    expect(resultado).not.toHaveProperty('contrasenaHash');

    expect(resultado).not.toHaveProperty('estado');
  });

  it('debe rechazar un usuario inexistente', async () => {
    repository.usuario = null;

    await expect(useCase.execute('usuario-inexistente')).rejects.toBeInstanceOf(
      UsuarioNoEncontradoError,
    );
  });
});
