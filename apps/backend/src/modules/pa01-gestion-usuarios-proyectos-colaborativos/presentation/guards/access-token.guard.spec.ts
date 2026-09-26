import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { type CrearSesionDatos, type Sesion } from '../../domain/models/sesion';
import { SesionRepository } from '../../domain/repositories/sesion.repository';
import {
  TokenService,
  type TokenIdentity,
  type TokensGenerados,
} from '../../application/ports/security/token-service';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from './access-token.guard';

class TokenServiceFake extends TokenService {
  tokenValido = true;

  identidad: TokenIdentity = {
    usuarioId: 'usuario-1',
    sesionId: 'sesion-1',
  };

  async generarTokens(): Promise<TokensGenerados> {
    throw new Error('No implementado para esta prueba');
  }

  async verificarAccessToken(): Promise<TokenIdentity> {
    if (!this.tokenValido) {
      throw new Error('Token inválido');
    }

    return this.identidad;
  }

  async verificarRefreshToken(): Promise<TokenIdentity> {
    throw new Error('No implementado para esta prueba');
  }
}

class SesionRepositoryFake extends SesionRepository {
  sesion: Sesion | null = null;

  async crear(_datos: CrearSesionDatos): Promise<Sesion> {
    throw new Error('No implementado para esta prueba');
  }

  async buscarPorRefreshTokenHash(
    _refreshTokenHash: string,
  ): Promise<Sesion | null> {
    return null;
  }

  async buscarPorId(_idSesion: string): Promise<Sesion | null> {
    return this.sesion;
  }

  async revocar(_idSesion: string, _fecha: Date): Promise<void> {}
}

function crearContexto(authorization?: string): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const request = {
    headers: {
      authorization,
    },
  } as AuthenticatedRequest;

  const context = {
    switchToHttp: () => ({
      getRequest: <T>() => request as T,
    }),
  } as ExecutionContext;

  return {
    context,
    request,
  };
}

describe('AccessTokenGuard', () => {
  let tokenService: TokenServiceFake;
  let sesionRepository: SesionRepositoryFake;
  let guard: AccessTokenGuard;

  beforeEach(() => {
    tokenService = new TokenServiceFake();
    sesionRepository = new SesionRepositoryFake();

    guard = new AccessTokenGuard(tokenService, sesionRepository);
  });

  it('debe permitir un access token con sesión válida', async () => {
    sesionRepository.sesion = {
      id: 'sesion-1',
      refreshTokenHash: 'refresh-token-hash',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 60_000),
      fechaRevocacion: null,
      dispositivo: null,
      idUsuario: 'usuario-1',
    };

    const { context, request } = crearContexto('Bearer access-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.usuarioId).toBe('usuario-1');

    expect(request.sesionId).toBe('sesion-1');
  });

  it('debe rechazar una petición sin Authorization', async () => {
    const { context } = crearContexto();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('debe rechazar un access token inválido', async () => {
    tokenService.tokenValido = false;

    const { context } = crearContexto('Bearer access-token-invalido');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
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

    const { context } = crearContexto('Bearer access-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('debe rechazar una sesión inexistente', async () => {
    sesionRepository.sesion = null;

    const { context } = crearContexto('Bearer access-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
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

    const { context } = crearContexto('Bearer access-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
