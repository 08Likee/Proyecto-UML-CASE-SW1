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
import { CerrarSesionUseCase } from './cerrar-sesion.use-case';

class SesionRepositoryFake extends SesionRepository {
  sesion: Sesion | null = null;

  sesionRevocada: {
    idSesion: string;
    fecha: Date;
  } | null = null;

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

  async revocar(idSesion: string, fecha: Date): Promise<void> {
    this.sesionRevocada = {
      idSesion,
      fecha,
    };
  }
}

class TokenServiceFake extends TokenService {
  tokenValido = true;

  async generarTokens(): Promise<TokensGenerados> {
    throw new Error('No implementado para esta prueba');
  }

  async verificarAccessToken(): Promise<TokenIdentity> {
    return {
      usuarioId: 'usuario-1',
      sesionId: 'sesion-1',
    };
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
  hash(): string {
    return 'refresh-token-hash';
  }
}

describe('CerrarSesionUseCase', () => {
  let sesionRepository: SesionRepositoryFake;
  let tokenService: TokenServiceFake;
  let useCase: CerrarSesionUseCase;

  beforeEach(() => {
    sesionRepository = new SesionRepositoryFake();
    tokenService = new TokenServiceFake();

    useCase = new CerrarSesionUseCase(
      sesionRepository,
      tokenService,
      new RefreshTokenHasherFake(),
    );
  });

  it('debe revocar una sesión válida', async () => {
    sesionRepository.sesion = {
      id: 'sesion-1',
      refreshTokenHash: 'refresh-token-hash',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 60_000),
      fechaRevocacion: null,
      dispositivo: null,
      idUsuario: 'usuario-1',
    };

    await useCase.execute('refresh-token');

    expect(sesionRepository.sesionRevocada?.idSesion).toBe('sesion-1');

    expect(sesionRepository.sesionRevocada?.fecha).toBeInstanceOf(Date);
  });

  it('debe rechazar un refresh token inválido', async () => {
    tokenService.tokenValido = false;

    await expect(
      useCase.execute('refresh-token-invalido'),
    ).rejects.toBeInstanceOf(SesionInvalidaError);

    expect(sesionRepository.sesionRevocada).toBeNull();
  });

  it('debe rechazar una sesión inexistente', async () => {
    sesionRepository.sesion = null;

    await expect(useCase.execute('refresh-token')).rejects.toBeInstanceOf(
      SesionInvalidaError,
    );

    expect(sesionRepository.sesionRevocada).toBeNull();
  });

  it('debe rechazar una sesión ya revocada', async () => {
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

    expect(sesionRepository.sesionRevocada).toBeNull();
  });

  it('debe rechazar una sesión de otro usuario', async () => {
    sesionRepository.sesion = {
      id: 'sesion-1',
      refreshTokenHash: 'refresh-token-hash',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 60_000),
      fechaRevocacion: null,
      dispositivo: null,
      idUsuario: 'otro-usuario',
    };

    await expect(useCase.execute('refresh-token')).rejects.toBeInstanceOf(
      SesionInvalidaError,
    );

    expect(sesionRepository.sesionRevocada).toBeNull();
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

    expect(sesionRepository.sesionRevocada).toBeNull();
  });
});
