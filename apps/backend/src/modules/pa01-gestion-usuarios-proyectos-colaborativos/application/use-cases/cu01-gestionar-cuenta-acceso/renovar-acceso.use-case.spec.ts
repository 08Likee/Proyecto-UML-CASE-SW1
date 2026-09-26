import { SesionInvalidaError } from '../../../domain/errors/sesion-invalida.error';
import {
  type CrearSesionDatos,
  type Sesion,
} from '../../../domain/models/sesion';
import { SesionRepository } from '../../../domain/repositories/sesion.repository';
import { RefreshTokenHasher } from '../../ports/security/refresh-token-hasher';
import {
  TokenService,
  type TokenIdentity,
  type TokensGenerados,
} from '../../ports/security/token-service';
import { RenovarAccesoUseCase } from './renovar-acceso.use-case';

class SesionRepositoryFake extends SesionRepository {
  sesion: Sesion | null = null;

  async crear(_datos: CrearSesionDatos): Promise<Sesion> {
    throw new Error('No implementado para esta prueba');
  }

  async buscarPorRefreshTokenHash(
    _refreshTokenHash: string,
  ): Promise<Sesion | null> {
    return this.sesion;
  }

  async buscarPorId(_idSesion: string): Promise<Sesion | null> {
    return this.sesion;
  }

  async revocar(_idSesion: string, _fecha: Date): Promise<void> {}
}

class TokenServiceFake extends TokenService {
  tokenValido = true;

  accessGenerado: {
    usuarioId: string;
    sesionId: string;
  } | null = null;

  async generarTokens(): Promise<TokensGenerados> {
    throw new Error('No implementado para esta prueba');
  }

  async generarAccessToken(
    usuarioId: string,
    sesionId: string,
  ): Promise<string> {
    this.accessGenerado = {
      usuarioId,
      sesionId,
    };

    return 'nuevo-access-token';
  }

  async verificarAccessToken(): Promise<TokenIdentity> {
    throw new Error('No implementado para esta prueba');
  }

  async verificarRefreshToken(): Promise<TokenIdentity> {
    if (!this.tokenValido) {
      throw new Error('Token inválido');
    }

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

describe('RenovarAccesoUseCase', () => {
  let sesionRepository: SesionRepositoryFake;
  let tokenService: TokenServiceFake;
  let refreshTokenHasher: RefreshTokenHasherFake;
  let useCase: RenovarAccesoUseCase;

  beforeEach(() => {
    sesionRepository = new SesionRepositoryFake();
    tokenService = new TokenServiceFake();
    refreshTokenHasher = new RefreshTokenHasherFake();

    useCase = new RenovarAccesoUseCase(
      sesionRepository,
      tokenService,
      refreshTokenHasher,
    );
  });

  it('debe generar un nuevo access token para una sesión válida', async () => {
    sesionRepository.sesion = {
      id: 'sesion-1',
      refreshTokenHash: 'refresh-token-hash',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 60_000),
      fechaRevocacion: null,
      dispositivo: null,
      idUsuario: 'usuario-1',
    };

    const resultado = await useCase.execute('refresh-token');

    expect(resultado).toEqual({
      accessToken: 'nuevo-access-token',
    });

    expect(refreshTokenHasher.ultimoToken).toBe('refresh-token');

    expect(tokenService.accessGenerado).toEqual({
      usuarioId: 'usuario-1',
      sesionId: 'sesion-1',
    });
  });

  it('debe rechazar un refresh token inválido', async () => {
    tokenService.tokenValido = false;

    await expect(
      useCase.execute('refresh-token-invalido'),
    ).rejects.toBeInstanceOf(SesionInvalidaError);

    expect(tokenService.accessGenerado).toBeNull();
  });

  it('debe rechazar una sesión inexistente', async () => {
    sesionRepository.sesion = null;

    await expect(useCase.execute('refresh-token')).rejects.toBeInstanceOf(
      SesionInvalidaError,
    );

    expect(tokenService.accessGenerado).toBeNull();
  });

  it('debe rechazar una sesión revocada', async () => {
    sesionRepository.sesion = {
      id: 'sesion-1',
      refreshTokenHash: 'refresh-token-hash',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 60_000),
      fechaRevocacion: new Date(),
      dispositivo: null,
      idUsuario: 'usuario-1',
    };

    await expect(useCase.execute('refresh-token')).rejects.toBeInstanceOf(
      SesionInvalidaError,
    );

    expect(tokenService.accessGenerado).toBeNull();
  });

  it('debe rechazar una sesión expirada', async () => {
    sesionRepository.sesion = {
      id: 'sesion-1',
      refreshTokenHash: 'refresh-token-hash',
      fechaCreacion: new Date(Date.now() - 120_000),
      fechaExpiracion: new Date(Date.now() - 60_000),
      fechaRevocacion: null,
      dispositivo: null,
      idUsuario: 'usuario-1',
    };

    await expect(useCase.execute('refresh-token')).rejects.toBeInstanceOf(
      SesionInvalidaError,
    );

    expect(tokenService.accessGenerado).toBeNull();
  });

  it('debe rechazar una sesión que no corresponde al token', async () => {
    sesionRepository.sesion = {
      id: 'otra-sesion',
      refreshTokenHash: 'refresh-token-hash',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 60_000),
      fechaRevocacion: null,
      dispositivo: null,
      idUsuario: 'usuario-1',
    };

    await expect(useCase.execute('refresh-token')).rejects.toBeInstanceOf(
      SesionInvalidaError,
    );

    expect(tokenService.accessGenerado).toBeNull();
  });
});
