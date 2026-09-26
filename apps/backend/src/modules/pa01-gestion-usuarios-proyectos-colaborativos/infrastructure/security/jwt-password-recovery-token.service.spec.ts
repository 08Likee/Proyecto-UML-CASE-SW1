import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPasswordRecoveryTokenService } from './jwt-password-recovery-token.service';

describe('JwtPasswordRecoveryTokenService', () => {
  let jwtService: JwtService;
  let service: JwtPasswordRecoveryTokenService;

  beforeEach(() => {
    jwtService = new JwtService();

    const configService = new ConfigService({
      JWT_PASSWORD_RECOVERY_SECRET: 'secreto-recuperacion-pruebas',
      JWT_PASSWORD_RECOVERY_TTL_SECONDS: '900',
    });

    service = new JwtPasswordRecoveryTokenService(jwtService, configService);
  });

  it('debe generar y verificar un token de recuperación', async () => {
    const token = await service.generar('usuario-1', 'hash-scrypt-actual');

    expect(token).toEqual(expect.any(String));

    const identidad = await service.verificar(token);

    expect(identidad.usuarioId).toBe('usuario-1');

    expect(identidad.contrasenaHuella).toMatch(/^[a-f0-9]{64}$/);

    expect(
      service.coincideContrasenaActual(
        identidad.contrasenaHuella,
        'hash-scrypt-actual',
      ),
    ).toBe(true);
  });

  it('debe generar el token con una duración de 15 minutos', async () => {
    const token = await service.generar('usuario-1', 'hash-scrypt-actual');

    const payload = jwtService.decode(token) as {
      iat: number;
      exp: number;
    };

    expect(payload.exp - payload.iat).toBe(900);
  });

  it('debe dejar de corresponder cuando cambia la contraseña', async () => {
    const token = await service.generar('usuario-1', 'hash-scrypt-anterior');

    const identidad = await service.verificar(token);

    expect(
      service.coincideContrasenaActual(
        identidad.contrasenaHuella,
        'hash-scrypt-nuevo',
      ),
    ).toBe(false);
  });

  it('debe rechazar un token firmado con otro secreto', async () => {
    const otroJwtService = new JwtService();

    const token = await otroJwtService.signAsync(
      {
        sub: 'usuario-1',
        tipo: 'password_recovery',
        pwd: 'a'.repeat(64),
      },
      {
        secret: 'otro-secreto',
        expiresIn: 900,
      },
    );

    await expect(service.verificar(token)).rejects.toThrow();
  });
});
