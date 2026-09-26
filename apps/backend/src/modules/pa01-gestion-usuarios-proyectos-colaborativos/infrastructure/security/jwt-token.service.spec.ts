import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService();

    const configService = new ConfigService({
      JWT_ACCESS_SECRET: 'access-secret-de-prueba',
      JWT_REFRESH_SECRET: 'refresh-secret-de-prueba',
      JWT_ACCESS_TTL_SECONDS: '900',
      JWT_REFRESH_TTL_SECONDS: '604800',
    });

    service = new JwtTokenService(jwtService, configService);
  });

  it('debe generar access token y refresh token', async () => {
    const resultado = await service.generarTokens('usuario-123');

    expect(resultado.accessToken).toEqual(expect.any(String));

    expect(resultado.refreshToken).toEqual(expect.any(String));

    expect(resultado.accessToken).not.toBe(resultado.refreshToken);

    expect(resultado.sesionId).toEqual(expect.any(String));
  });

  it('debe generar tokens con las duraciones configuradas', async () => {
    const resultado = await service.generarTokens('usuario-123');

    const accessPayload = jwtService.decode(resultado.accessToken);

    const refreshPayload = jwtService.decode(resultado.refreshToken);

    expect(accessPayload.exp - accessPayload.iat).toBe(900);

    expect(refreshPayload.exp - refreshPayload.iat).toBe(604800);
  });

  it('debe verificar correctamente cada tipo de token', async () => {
    const resultado = await service.generarTokens('usuario-123');

    await expect(
      service.verificarAccessToken(resultado.accessToken),
    ).resolves.toEqual({
      usuarioId: 'usuario-123',
      sesionId: resultado.sesionId,
    });

    await expect(
      service.verificarRefreshToken(resultado.refreshToken),
    ).resolves.toEqual({
      usuarioId: 'usuario-123',
      sesionId: resultado.sesionId,
    });

    const accessPayload = jwtService.decode(resultado.accessToken);

    const refreshPayload = jwtService.decode(resultado.refreshToken);

    expect(accessPayload.sid).toBe(resultado.sesionId);
    expect(refreshPayload.sid).toBe(resultado.sesionId);
  });

  it('no debe aceptar un refresh token como access token', async () => {
    const resultado = await service.generarTokens('usuario-123');

    await expect(
      service.verificarAccessToken(resultado.refreshToken),
    ).rejects.toThrow();
  });
});
