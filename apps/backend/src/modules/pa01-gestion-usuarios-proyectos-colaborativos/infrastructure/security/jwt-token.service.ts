import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import {
  type TokensGenerados,
  TokenService,
  TokenIdentity,
} from '../../application/ports/security/token-service';

type TipoToken = 'access' | 'refresh';

interface JwtClaims {
  sub: string;
  sid: string;
  tipo: TipoToken;
  jti: string;
}

@Injectable()
export class JwtTokenService implements TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.getRequiredEnv('JWT_ACCESS_SECRET');

    this.refreshSecret = this.getRequiredEnv('JWT_REFRESH_SECRET');

    this.accessTtlSeconds = this.getPositiveIntegerEnv(
      'JWT_ACCESS_TTL_SECONDS',
    );

    this.refreshTtlSeconds = this.getPositiveIntegerEnv(
      'JWT_REFRESH_TTL_SECONDS',
    );
  }

  async generarTokens(usuarioId: string): Promise<TokensGenerados> {
    const sesionId = randomUUID();
    const accessPayload: JwtClaims = {
      sub: usuarioId,
      sid: sesionId,
      tipo: 'access',
      jti: randomUUID(),
    };

    const refreshPayload: JwtClaims = {
      sub: usuarioId,
      sid: sesionId,
      tipo: 'refresh',
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessTtlSeconds,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtlSeconds,
      }),
    ]);

    return {
      sesionId,
      accessToken,
      refreshToken,
      refreshTokenExpiraEn: new Date(
        Date.now() + this.refreshTtlSeconds * 1000,
      ),
    };
  }

  async verificarAccessToken(token: string): Promise<TokenIdentity> {
    const payload = await this.jwtService.verifyAsync<JwtClaims>(token, {
      secret: this.accessSecret,
    });

    if (payload.tipo !== 'access' || !payload.sub || !payload.sid) {
      throw new Error('Token de acceso inválido');
    }

    return {
      usuarioId: payload.sub,
      sesionId: payload.sid,
    };
  }

  async verificarRefreshToken(token: string): Promise<TokenIdentity> {
    const payload = await this.jwtService.verifyAsync<JwtClaims>(token, {
      secret: this.refreshSecret,
    });

    if (payload.tipo !== 'refresh' || !payload.sub || !payload.sid) {
      throw new Error('Refresh token inválido');
    }

    return {
      usuarioId: payload.sub,
      sesionId: payload.sid,
    };
  }

  private getRequiredEnv(name: string): string {
    const value = this.configService.get<string>(name);

    if (!value) {
      throw new Error(`La variable de entorno ${name} es obligatoria`);
    }

    return value;
  }

  private getPositiveIntegerEnv(name: string): number {
    const value = Number(this.getRequiredEnv(name));

    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(
        `La variable de entorno ${name} debe ser un entero positivo`,
      );
    }

    return value;
  }
}
