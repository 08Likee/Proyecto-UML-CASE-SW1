import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  PasswordRecoveryTokenService,
  type PasswordRecoveryTokenIdentity,
} from '../../application/ports/security/password-recovery-token.service';

interface PasswordRecoveryClaims {
  sub: string;
  tipo: 'password_recovery';
  pwd: string;
  jti: string;
}

@Injectable()
export class JwtPasswordRecoveryTokenService extends PasswordRecoveryTokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    super();

    const secret = configService.get<string>('JWT_PASSWORD_RECOVERY_SECRET');

    if (!secret) {
      throw new Error('JWT_PASSWORD_RECOVERY_SECRET no está configurado');
    }

    this.secret = secret;

    this.ttlSeconds = this.obtenerEnteroPositivo(
      configService,
      'JWT_PASSWORD_RECOVERY_TTL_SECONDS',
    );
  }

  async generar(usuarioId: string, contrasenaHash: string): Promise<string> {
    const payload: PasswordRecoveryClaims = {
      sub: usuarioId,
      tipo: 'password_recovery',
      pwd: this.crearHuella(contrasenaHash),
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.ttlSeconds,
    });
  }

  async verificar(token: string): Promise<PasswordRecoveryTokenIdentity> {
    const payload = await this.jwtService.verifyAsync<PasswordRecoveryClaims>(
      token,
      {
        secret: this.secret,
      },
    );

    if (payload.tipo !== 'password_recovery' || !payload.sub || !payload.pwd) {
      throw new Error('Token de recuperación inválido');
    }

    return {
      usuarioId: payload.sub,
      contrasenaHuella: payload.pwd,
    };
  }

  coincideContrasenaActual(
    contrasenaHuella: string,
    contrasenaHashActual: string,
  ): boolean {
    const esperada = Buffer.from(this.crearHuella(contrasenaHashActual), 'hex');

    const recibida = Buffer.from(contrasenaHuella, 'hex');

    if (esperada.length !== recibida.length) {
      return false;
    }

    return timingSafeEqual(esperada, recibida);
  }

  private crearHuella(contrasenaHash: string): string {
    return createHash('sha256').update(contrasenaHash).digest('hex');
  }

  private obtenerEnteroPositivo(
    configService: ConfigService,
    nombre: string,
  ): number {
    const valor = configService.get<string>(nombre);

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
      throw new Error(`${nombre} debe ser un entero positivo`);
    }

    return numero;
  }
}
