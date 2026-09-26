import { CredencialesInvalidasError } from '../../../domain/errors/credenciales-invalidas.error';
import {
  type CrearSesionDatos,
  type Sesion,
} from '../../../domain/models/sesion';
import {
  type CrearUsuarioDatos,
  type Usuario,
} from '../../../domain/models/usuario';
import { SesionRepository } from '../../../domain/repositories/sesion.repository';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { PasswordHasher } from '../../ports/security/password-hasher';
import { RefreshTokenHasher } from '../../ports/security/refresh-token-hasher';
import {
  TokenService,
  type TokenIdentity,
  type TokensGenerados,
} from '../../ports/security/token-service';
import { IniciarSesionUseCase } from './iniciar-sesion.use-case';

class UsuarioRepositoryFake extends UsuarioRepository {
  usuario: Usuario | null = null;

  ultimaConexionActualizada: {
    idUsuario: string;
    fecha: Date;
  } | null = null;

  async buscarPorCorreo(): Promise<Usuario | null> {
    return this.usuario;
  }

  async crear(_datos: CrearUsuarioDatos): Promise<Usuario> {
    throw new Error('No implementado para esta prueba');
  }

  async actualizarUltimaConexion(
    idUsuario: string,
    fecha: Date,
  ): Promise<void> {
    this.ultimaConexionActualizada = {
      idUsuario,
      fecha,
    };
  }
}

class SesionRepositoryFake extends SesionRepository {
  ultimaSesion: CrearSesionDatos | null = null;

  async crear(datos: CrearSesionDatos): Promise<Sesion> {
    this.ultimaSesion = datos;

    return {
      id: datos.id,
      refreshTokenHash: datos.refreshTokenHash,
      fechaCreacion: new Date('2026-09-25T18:00:00Z'),
      fechaExpiracion: datos.fechaExpiracion,
      fechaRevocacion: null,
      dispositivo: datos.dispositivo ?? null,
      idUsuario: datos.idUsuario,
    };
  }

  async buscarPorRefreshTokenHash(
    _refreshTokenHash: string,
  ): Promise<Sesion | null> {
    return null;
  }

  async buscarPorId(_idSesion: string): Promise<Sesion | null> {
    return null;
  }

  async revocar(_idSesion: string, _fecha: Date): Promise<void> {}
}

class PasswordHasherFake extends PasswordHasher {
  valido = true;

  async hash(): Promise<string> {
    return 'hash';
  }

  async verify(): Promise<boolean> {
    return this.valido;
  }
}

class TokenServiceFake extends TokenService {
  generado = false;

  async generarTokens(): Promise<TokensGenerados> {
    this.generado = true;

    return {
      sesionId: 'sesion-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshTokenExpiraEn: new Date('2026-10-02T18:00:00Z'),
    };
  }

  async verificarAccessToken(): Promise<TokenIdentity> {
    return {
      usuarioId: 'usuario-1',
      sesionId: 'sesion-1',
    };
  }

  async verificarRefreshToken(): Promise<TokenIdentity> {
    return {
      usuarioId: 'usuario-1',
      sesionId: 'sesion-1',
    };
  }
}

class RefreshTokenHasherFake extends RefreshTokenHasher {
  ultimoToken: string | null = null;

  hash(token: string): string {
    this.ultimoToken = token;

    return 'refresh-token-hash';
  }
}

describe('IniciarSesionUseCase', () => {
  let usuarioRepository: UsuarioRepositoryFake;
  let sesionRepository: SesionRepositoryFake;
  let passwordHasher: PasswordHasherFake;
  let tokenService: TokenServiceFake;
  let refreshTokenHasher: RefreshTokenHasherFake;
  let useCase: IniciarSesionUseCase;

  const usuarioActivo: Usuario = {
    id: 'usuario-1',
    nombre: 'Luis',
    apellido: 'Mendoza',
    correo: 'luis@example.com',
    contrasenaHash: 'hash-scrypt',
    fotoPerfil: null,
    estado: 'ACTIVO',
    fechaRegistro: new Date(),
    ultimaConexion: null,
  };

  beforeEach(() => {
    usuarioRepository = new UsuarioRepositoryFake();
    sesionRepository = new SesionRepositoryFake();
    passwordHasher = new PasswordHasherFake();
    tokenService = new TokenServiceFake();
    refreshTokenHasher = new RefreshTokenHasherFake();

    useCase = new IniciarSesionUseCase(
      usuarioRepository,
      sesionRepository,
      passwordHasher,
      tokenService,
      refreshTokenHasher,
    );
  });

  it('debe iniciar sesión con credenciales válidas', async () => {
    usuarioRepository.usuario = usuarioActivo;

    const resultado = await useCase.execute({
      correo: ' LUIS@EXAMPLE.COM ',
      contrasena: 'ClaveSegura123!',
      dispositivo: 'Chrome en Windows',
    });

    expect(resultado).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      usuario: {
        id: 'usuario-1',
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo: 'luis@example.com',
        fotoPerfil: null,
      },
    });

    expect(refreshTokenHasher.ultimoToken).toBe('refresh-token');

    expect(sesionRepository.ultimaSesion).toEqual({
      id: 'sesion-1',
      refreshTokenHash: 'refresh-token-hash',
      fechaExpiracion: new Date('2026-10-02T18:00:00Z'),
      dispositivo: 'Chrome en Windows',
      idUsuario: 'usuario-1',
    });

    expect(usuarioRepository.ultimaConexionActualizada?.idUsuario).toBe(
      'usuario-1',
    );

    expect(usuarioRepository.ultimaConexionActualizada?.fecha).toBeInstanceOf(
      Date,
    );
  });

  it('debe rechazar un correo inexistente', async () => {
    usuarioRepository.usuario = null;

    await expect(
      useCase.execute({
        correo: 'nadie@example.com',
        contrasena: 'ClaveSegura123!',
      }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(tokenService.generado).toBe(false);
    expect(sesionRepository.ultimaSesion).toBeNull();

    expect(usuarioRepository.ultimaConexionActualizada).toBeNull();
  });

  it('debe rechazar una contraseña incorrecta', async () => {
    usuarioRepository.usuario = usuarioActivo;
    passwordHasher.valido = false;

    await expect(
      useCase.execute({
        correo: 'luis@example.com',
        contrasena: 'Incorrecta',
      }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(tokenService.generado).toBe(false);
    expect(sesionRepository.ultimaSesion).toBeNull();

    expect(usuarioRepository.ultimaConexionActualizada).toBeNull();
  });

  it('debe rechazar una cuenta que no esté activa', async () => {
    usuarioRepository.usuario = {
      ...usuarioActivo,
      estado: 'BLOQUEADO',
    };

    await expect(
      useCase.execute({
        correo: 'luis@example.com',
        contrasena: 'ClaveSegura123!',
      }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(tokenService.generado).toBe(false);
    expect(sesionRepository.ultimaSesion).toBeNull();

    expect(usuarioRepository.ultimaConexionActualizada).toBeNull();
  });
});
