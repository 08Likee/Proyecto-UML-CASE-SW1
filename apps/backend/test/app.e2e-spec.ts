import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

import {
  PasswordRecoveryNotifier,
  type PasswordRecoveryNotification,
} from '../src/modules/pa01-gestion-usuarios-proyectos-colaborativos/application/ports/notifications/password-recovery-notifier';

class PasswordRecoveryNotifierFake extends PasswordRecoveryNotifier {
  ultimaNotificacion: PasswordRecoveryNotification | null = null;

  async enviar(datos: PasswordRecoveryNotification): Promise<void> {
    this.ultimaNotificacion = datos;
  }

  limpiar(): void {
    this.ultimaNotificacion = null;
  }
}

describe('Aplicacion (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let passwordRecoveryNotifier: PasswordRecoveryNotifierFake;

  const testEmailPattern = 'sw1-e2e-%@example.test';

  async function limpiarUsuariosDePrueba(): Promise<void> {
    await dataSource.query('DELETE FROM usuario WHERE correo LIKE $1', [
      testEmailPattern,
    ]);
  }

  beforeAll(async () => {
    passwordRecoveryNotifier = new PasswordRecoveryNotifierFake();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PasswordRecoveryNotifier)
      .useValue(passwordRecoveryNotifier)
      .compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);

    await app.init();

    dataSource = app.get(DataSource);

    await limpiarUsuariosDePrueba();
  });

  afterEach(async () => {
    passwordRecoveryNotifier.limpiar();
    await limpiarUsuariosDePrueba();
  });

  afterAll(async () => {
    await limpiarUsuariosDePrueba();
    await app.close();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'backend',
      database: 'connected',
      timestamp: expect.any(String),
    });
  });

  it('/api/auth/registro registra una cuenta valida', async () => {
    const correo = 'sw1-e2e-registro@example.test';

    const response = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena: 'ClaveSegura123!',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      nombre: 'Luis',
      apellido: 'Mendoza',
      correo,
      estado: 'ACTIVO',
      fotoPerfil: null,
    });

    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.fechaRegistro).toEqual(expect.any(String));

    expect(response.body).not.toHaveProperty('contrasena');
    expect(response.body).not.toHaveProperty('contrasenaHash');

    const usuarios = await dataSource.query<
      Array<{
        correo: string;
        contrasena_hash: string;
      }>
    >(
      `
        SELECT correo, contrasena_hash
        FROM usuario
        WHERE correo = $1
      `,
      [correo],
    );

    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].correo).toBe(correo);
    expect(usuarios[0].contrasena_hash).toMatch(/^scrypt\$/);
    expect(usuarios[0].contrasena_hash).not.toContain('ClaveSegura123!');
  });

  it('/api/auth/registro rechaza un correo duplicado', async () => {
    const correo = 'sw1-e2e-duplicado@example.test';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Primer',
        apellido: 'Usuario',
        correo,
        contrasena: 'ClaveSegura123!',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Segundo',
        apellido: 'Usuario',
        correo: correo.toUpperCase(),
        contrasena: 'OtraClave123!',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: 'El correo ya se encuentra registrado',
    });
  });

  it('/api/auth/registro rechaza si falta apellido', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Nuevo',
        correo: 'sw1-e2e-sin-apellido@example.test',
        contrasena: 'ClaveSegura123!',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['apellido should not be empty']),
    );
  });

  it('/api/auth/registro rechaza si falta nombre', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        apellido: 'Usuario',
        correo: 'sw1-e2e-sin-nombre@example.test',
        contrasena: 'ClaveSegura123!',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['nombre should not be empty']),
    );
  });

  it('/api/auth/registro rechaza propiedades desconocidas', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Nuevo',
        apellido: 'Usuario',
        correo: 'sw1-e2e-extra@example.test',
        contrasena: 'ClaveSegura123!',
        propiedadInventada: 'valor',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['property propiedadInventada should not exist']),
    );
  });

  it('/api/auth/registro controla registros concurrentes', async () => {
    const correo = 'sw1-e2e-concurrente@example.test';

    const body = {
      nombre: 'Usuario',
      apellido: 'Concurrente',
      correo,
      contrasena: 'ClaveSegura123!',
    };

    const [primera, segunda] = await Promise.all([
      request(app.getHttpServer()).post('/api/auth/registro').send(body),

      request(app.getHttpServer()).post('/api/auth/registro').send(body),
    ]);

    const estados = [primera.status, segunda.status].sort((a, b) => a - b);

    expect(estados).toEqual([201, 409]);

    const resultado = await dataSource.query<Array<{ cantidad: string }>>(
      `
        SELECT COUNT(*) AS cantidad
        FROM usuario
        WHERE correo = $1
      `,
      [correo],
    );

    expect(Number(resultado[0].cantidad)).toBe(1);
  });

  it('/api/auth/login inicia sesión correctamente', async () => {
    const correo = 'sw1-e2e-login@example.test';
    const contrasena = 'ClaveSegura123!';

    const registro = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena,
      })
      .expect(201);

    const usuarioId = registro.body.id;

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('User-Agent', 'Navegador e2e SW1')
      .send({
        correo: correo.toUpperCase(),
        contrasena,
      })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));

    expect(response.body.refreshToken).toEqual(expect.any(String));

    expect(response.body.usuario).toEqual({
      id: usuarioId,
      nombre: 'Luis',
      apellido: 'Mendoza',
      correo,
      fotoPerfil: null,
    });

    expect(response.body.usuario).not.toHaveProperty('contrasenaHash');

    const sesiones = await dataSource.query<
      Array<{
        refresh_token_hash: string;
        fecha_creacion: Date;
        fecha_expiracion: Date;
        fecha_revocacion: Date | null;
        dispositivo: string | null;
      }>
    >(
      `
      SELECT
        refresh_token_hash,
        fecha_creacion,
        fecha_expiracion,
        fecha_revocacion,
        dispositivo
      FROM sesion
      WHERE id_usuario = $1
    `,
      [usuarioId],
    );

    expect(sesiones).toHaveLength(1);

    expect(sesiones[0].refresh_token_hash).toMatch(/^[a-f0-9]{64}$/);

    expect(sesiones[0].refresh_token_hash).not.toBe(response.body.refreshToken);

    expect(sesiones[0].fecha_revocacion).toBeNull();

    expect(sesiones[0].dispositivo).toBe('Navegador e2e SW1');

    const diferenciaMs =
      new Date(sesiones[0].fecha_expiracion).getTime() -
      new Date(sesiones[0].fecha_creacion).getTime();

    expect(diferenciaMs).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 5000);

    expect(diferenciaMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 5000);

    const usuarios = await dataSource.query<
      Array<{ ultima_conexion: Date | null }>
    >(
      `
      SELECT ultima_conexion
      FROM usuario
      WHERE id = $1
    `,
      [usuarioId],
    );

    expect(usuarios[0].ultima_conexion).not.toBeNull();
  });

  it('/api/auth/login rechaza una contraseña incorrecta', async () => {
    const correo = 'sw1-e2e-login-password@example.test';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena: 'ClaveSegura123!',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: 'ClaveIncorrecta!',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Las credenciales proporcionadas no son válidas',
    });
  });

  it('/api/auth/login rechaza un correo inexistente', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo: 'sw1-e2e-login-inexistente@example.test',
        contrasena: 'ClaveSegura123!',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Las credenciales proporcionadas no son válidas',
    });
  });

  it('/api/auth/logout revoca la sesión actual', async () => {
    const correo = 'sw1-e2e-logout@example.test';
    const contrasena = 'ClaveSegura123!';

    const registro = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena,
      })
      .expect(201);

    const usuarioId = registro.body.id;

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena,
      })
      .expect(200);

    expect(login.body.refreshToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({
        refreshToken: login.body.refreshToken,
      })
      .expect(204);

    const sesiones = await dataSource.query<
      Array<{
        fecha_revocacion: Date | null;
      }>
    >(
      `
      SELECT fecha_revocacion
      FROM sesion
      WHERE id_usuario = $1
      ORDER BY fecha_creacion DESC
      LIMIT 1
    `,
      [usuarioId],
    );

    expect(sesiones).toHaveLength(1);
    expect(sesiones[0].fecha_revocacion).not.toBeNull();
  });

  it('/api/auth/logout rechaza una sesión ya revocada', async () => {
    const correo = 'sw1-e2e-logout-repetido@example.test';

    const contrasena = 'ClaveSegura123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena,
      })
      .expect(200);

    const body = {
      refreshToken: login.body.refreshToken,
    };

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send(body)
      .expect(204);

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send(body)
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'La sesión no es válida o ya finalizó',
    });
  });

  it('/api/auth/logout rechaza un refresh token vacío', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({
        refreshToken: '',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['refreshToken should not be empty']),
    );
  });

  it('/api/auth/sesion invalida el access token después del logout', async () => {
    const correo = 'sw1-e2e-sesion-revocada@example.test';

    const contrasena = 'ClaveSegura123!';

    const registro = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena,
      })
      .expect(200);

    const accessToken = login.body.accessToken;
    const refreshToken = login.body.refreshToken;

    const sesionValida = await request(app.getHttpServer())
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(sesionValida.body).toEqual({
      autenticado: true,
      usuarioId: registro.body.id,
    });

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({
        refreshToken,
      })
      .expect(204);

    const sesionRevocada = await request(app.getHttpServer())
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    expect(sesionRevocada.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de acceso inválido o expirado',
    });
  });

  it('/api/auth/sesion rechaza una petición sin access token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/sesion')
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Se requiere autenticación',
    });
  });

  it('/api/auth/sesion no acepta un refresh token como access token', async () => {
    const correo = 'sw1-e2e-refresh-como-access@example.test';

    const contrasena = 'ClaveSegura123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena,
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${login.body.refreshToken}`)
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de acceso inválido o expirado',
    });
  });

  it('/api/auth/refresh renueva el access token de una sesión válida', async () => {
    const correo = 'sw1-e2e-refresh-valido@example.test';

    const contrasena = 'ClaveSegura123!';

    const registro = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena,
      })
      .expect(201);

    const usuarioId = registro.body.id;

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena,
      })
      .expect(200);

    const accessTokenAnterior = login.body.accessToken;

    const refreshToken = login.body.refreshToken;

    const sesionesAntes = await dataSource.query<
      Array<{
        id: string;
        fecha_expiracion: Date;
        fecha_revocacion: Date | null;
      }>
    >(
      `
      SELECT
        id,
        fecha_expiracion,
        fecha_revocacion
      FROM sesion
      WHERE id_usuario = $1
    `,
      [usuarioId],
    );

    expect(sesionesAntes).toHaveLength(1);

    const sesionIdOriginal = sesionesAntes[0].id;

    const expiracionOriginal = new Date(
      sesionesAntes[0].fecha_expiracion,
    ).getTime();

    expect(sesionesAntes[0].fecha_revocacion).toBeNull();

    const renovacion = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(200);

    expect(renovacion.body.accessToken).toEqual(expect.any(String));

    expect(renovacion.body.accessToken).not.toBe(accessTokenAnterior);

    await request(app.getHttpServer())
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${renovacion.body.accessToken}`)
      .expect(200);

    const sesionesDespues = await dataSource.query<
      Array<{
        id: string;
        fecha_expiracion: Date;
        fecha_revocacion: Date | null;
      }>
    >(
      `
      SELECT
        id,
        fecha_expiracion,
        fecha_revocacion
      FROM sesion
      WHERE id_usuario = $1
    `,
      [usuarioId],
    );

    expect(sesionesDespues).toHaveLength(1);

    expect(sesionesDespues[0].id).toBe(sesionIdOriginal);

    expect(new Date(sesionesDespues[0].fecha_expiracion).getTime()).toBe(
      expiracionOriginal,
    );

    expect(sesionesDespues[0].fecha_revocacion).toBeNull();
  });

  it('/api/auth/refresh rechaza una sesión revocada', async () => {
    const correo = 'sw1-e2e-refresh-revocado@example.test';

    const contrasena = 'ClaveSegura123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena,
      })
      .expect(200);

    const refreshToken = login.body.refreshToken;

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({
        refreshToken,
      })
      .expect(204);

    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'La sesión no es válida o ya finalizó',
    });
  });

  it('/api/auth/refresh rechaza un refresh token vacío', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: '',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['refreshToken should not be empty']),
    );
  });

  it('/api/auth/recuperacion/solicitar acepta una cuenta existente', async () => {
    const correo = 'sw1-e2e-recuperacion@example.test';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena: 'ClaveSegura123!',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/auth/recuperacion/solicitar')
      .send({
        correo: correo.toUpperCase(),
      })
      .expect(202);

    expect(passwordRecoveryNotifier.ultimaNotificacion).toMatchObject({
      correo,
      nombre: 'Luis',
      token: expect.any(String),
    });

    expect(response.body).toEqual({
      message:
        'Si existe una cuenta asociada al correo, recibirás instrucciones para recuperar el acceso.',
    });
  });

  it('/api/auth/recuperacion/solicitar no revela si la cuenta no existe', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/recuperacion/solicitar')
      .send({
        correo: 'sw1-e2e-recuperacion-inexistente@example.test',
      })
      .expect(202);

    expect(passwordRecoveryNotifier.ultimaNotificacion).toBeNull();

    expect(response.body).toEqual({
      message:
        'Si existe una cuenta asociada al correo, recibirás instrucciones para recuperar el acceso.',
    });
  });

  it('/api/auth/recuperacion/solicitar rechaza un correo inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/recuperacion/solicitar')
      .send({
        correo: 'correo-invalido',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['correo must be an email']),
    );
  });

  it('/api/auth/recuperacion/confirmar recupera la contraseña y revoca las sesiones anteriores', async () => {
    const correo = 'sw1-e2e-recuperacion-confirmar@example.test';

    const contrasenaAnterior = 'ClaveAnterior123!';

    const nuevaContrasena = 'NuevaClave123!';

    const registro = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena: contrasenaAnterior,
      })
      .expect(201);

    const usuarioId = registro.body.id;

    const loginAnterior = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: contrasenaAnterior,
      })
      .expect(200);

    const accessTokenAnterior = loginAnterior.body.accessToken;

    const refreshTokenAnterior = loginAnterior.body.refreshToken;

    const sesionesAntes = await dataSource.query<
      Array<{
        id: string;
        fecha_revocacion: Date | null;
      }>
    >(
      `
        SELECT id, fecha_revocacion
        FROM sesion
        WHERE id_usuario = $1
      `,
      [usuarioId],
    );

    expect(sesionesAntes).toHaveLength(1);

    const sesionAnteriorId = sesionesAntes[0].id;

    expect(sesionesAntes[0].fecha_revocacion).toBeNull();

    await request(app.getHttpServer())
      .post('/api/auth/recuperacion/solicitar')
      .send({
        correo,
      })
      .expect(202);

    const notificacion = passwordRecoveryNotifier.ultimaNotificacion;

    expect(notificacion).not.toBeNull();

    const tokenRecuperacion = notificacion!.token;

    const confirmacion = await request(app.getHttpServer())
      .post('/api/auth/recuperacion/confirmar')
      .send({
        token: tokenRecuperacion,
        nuevaContrasena,
        confirmacionContrasena: nuevaContrasena,
      });

    expect(confirmacion.body).toEqual({
      message: 'La contraseña fue actualizada correctamente.',
    });

    const sesionAnterior = await dataSource.query<
      Array<{
        fecha_revocacion: Date | null;
      }>
    >(
      `
        SELECT fecha_revocacion
        FROM sesion
        WHERE id = $1
      `,
      [sesionAnteriorId],
    );

    expect(sesionAnterior).toHaveLength(1);

    expect(sesionAnterior[0].fecha_revocacion).not.toBeNull();

    await request(app.getHttpServer())
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${accessTokenAnterior}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: refreshTokenAnterior,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: contrasenaAnterior,
      })
      .expect(401);

    const nuevoLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: nuevaContrasena,
      })
      .expect(200);

    expect(nuevoLogin.body.accessToken).toEqual(expect.any(String));

    expect(nuevoLogin.body.refreshToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/auth/recuperacion/confirmar')
      .send({
        token: tokenRecuperacion,
        nuevaContrasena: 'OtraNuevaClave123!',
        confirmacionContrasena: 'OtraNuevaClave123!',
      })
      .expect(401);
  });

  it('/api/auth/recuperacion/confirmar rechaza contraseñas que no coinciden', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/recuperacion/confirmar')
      .send({
        token: 'token-cualquiera',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'OtraClave123!',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'La nueva contraseña y su confirmación no coinciden',
    });
  });

  it('/api/auth/recuperacion/confirmar rechaza un token inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/recuperacion/confirmar')
      .send({
        token: 'token-invalido',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message:
        'El mecanismo de recuperación no es válido o ya no se encuentra vigente',
    });
  });
});
