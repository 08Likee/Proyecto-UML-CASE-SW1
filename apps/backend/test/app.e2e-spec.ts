import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
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

  const testProjectNamePattern = 'SW1-E2E-%';

  async function limpiarUsuariosDePrueba(): Promise<void> {
    if (!dataSource?.isInitialized) {
      return;
    }

    await dataSource.query(
      `
      DELETE FROM modelo_uml
      WHERE id_proyecto IN (
        SELECT id
        FROM proyecto
        WHERE nombre LIKE $1)
    `,
      [testProjectNamePattern],
    );

    await dataSource.query(
      `
      DELETE FROM permiso_membresia
      WHERE id_membresia IN (
      SELECT m.id
      FROM membresia m
      INNER JOIN proyecto p
      ON p.id = m.id_proyecto
      WHERE p.nombre LIKE $1)
    `,
      [testProjectNamePattern],
    );

    await dataSource.query(
      `
      DELETE FROM invitacion
      WHERE id_proyecto IN (
      SELECT id
      FROM proyecto
      WHERE nombre LIKE $1)
    `,
      [testProjectNamePattern],
    );

    await dataSource.query(
      `
      DELETE FROM membresia
      WHERE id_proyecto IN (
      SELECT id
      FROM proyecto
      WHERE nombre LIKE $1)
    `,
      [testProjectNamePattern],
    );

    await dataSource.query(
      `
      DELETE FROM rol
      WHERE id_proyecto IN (
      SELECT id
      FROM proyecto
      WHERE nombre LIKE $1)
    `,
      [testProjectNamePattern],
    );

    await dataSource.query(
      `
      DELETE FROM proyecto
      WHERE nombre LIKE $1
    `,
      [testProjectNamePattern],
    );

    await dataSource.query(
      `
      DELETE FROM usuario
      WHERE correo LIKE $1
    `,
      [testEmailPattern],
    );
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

  it('/api/auth/perfil modifica únicamente la información permitida', async () => {
    const correo = 'sw1-e2e-modificar-perfil@example.test';

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

    const response = await request(app.getHttpServer())
      .put('/api/auth/perfil')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        nombre: 'Luis Alberto',
        apellido: 'Mendoza Rojas',
        fotoPerfil: 'https://example.com/perfil.png',
      })
      .expect(200);

    expect(response.body).toEqual({
      id: registro.body.id,
      nombre: 'Luis Alberto',
      apellido: 'Mendoza Rojas',
      correo,
      fotoPerfil: 'https://example.com/perfil.png',
    });

    expect(response.body).not.toHaveProperty('contrasenaHash');

    const usuarios = await dataSource.query<
      Array<{
        nombre: string;
        apellido: string;
        correo: string;
        foto_perfil: string | null;
      }>
    >(
      `
      SELECT
        nombre,
        apellido,
        correo,
        foto_perfil
      FROM usuario
      WHERE id = $1
    `,
      [registro.body.id],
    );

    expect(usuarios).toHaveLength(1);

    expect(usuarios[0]).toMatchObject({
      nombre: 'Luis Alberto',
      apellido: 'Mendoza Rojas',
      correo,
      foto_perfil: 'https://example.com/perfil.png',
    });
  });

  it('/api/auth/perfil rechaza una modificación sin autenticación', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/auth/perfil')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Se requiere autenticación',
    });
  });

  it('/api/auth/perfil rechaza datos obligatorios vacíos', async () => {
    const correo = 'sw1-e2e-perfil-validacion@example.test';

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
      .put('/api/auth/perfil')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        nombre: '',
        apellido: '',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'nombre should not be empty',
        'apellido should not be empty',
      ]),
    );
  });

  it('/api/auth/perfil obtiene el perfil del usuario autenticado', async () => {
    const correo = 'sw1-e2e-obtener-perfil@example.test';

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

    const response = await request(app.getHttpServer())
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      id: registro.body.id,
      nombre: 'Luis',
      apellido: 'Mendoza',
      correo,
      fotoPerfil: null,
    });

    expect(response.body).not.toHaveProperty('contrasenaHash');
  });

  it('/api/auth/perfil rechaza una consulta sin autenticación', async () => {
    await request(app.getHttpServer()).get('/api/auth/perfil').expect(401);
  });

  it('/api/auth/contrasena cambia la contraseña del usuario autenticado', async () => {
    const correo = 'sw1-e2e-cambiar-contrasena@example.test';

    const contrasenaActual = 'ClaveActual123!';

    const nuevaContrasena = 'NuevaClave123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena: contrasenaActual,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: contrasenaActual,
      })
      .expect(200);

    const accessToken = login.body.accessToken;

    const response = await request(app.getHttpServer())
      .put('/api/auth/contrasena')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contrasenaActual,
        nuevaContrasena,
        confirmacionContrasena: nuevaContrasena,
      })
      .expect(200);

    expect(response.body).toEqual({
      message: 'La contraseña fue actualizada correctamente.',
    });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: contrasenaActual,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: nuevaContrasena,
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('/api/auth/contrasena rechaza una contraseña actual incorrecta', async () => {
    const correo = 'sw1-e2e-contrasena-incorrecta@example.test';

    const contrasenaActual = 'ClaveActual123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena: contrasenaActual,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: contrasenaActual,
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .put('/api/auth/contrasena')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        contrasenaActual: 'Incorrecta123!',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'La contraseña actual no es válida',
    });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: contrasenaActual,
      })
      .expect(200);
  });

  it('/api/auth/contrasena rechaza una confirmación diferente', async () => {
    const correo = 'sw1-e2e-contrasena-confirmacion@example.test';

    const contrasenaActual = 'ClaveActual123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Luis',
        apellido: 'Mendoza',
        correo,
        contrasena: contrasenaActual,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo,
        contrasena: contrasenaActual,
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .put('/api/auth/contrasena')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        contrasenaActual,
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

  it('/api/auth/contrasena rechaza un cambio sin autenticación', async () => {
    await request(app.getHttpServer())
      .put('/api/auth/contrasena')
      .send({
        contrasenaActual: 'ClaveActual123!',
        nuevaContrasena: 'NuevaClave123!',
        confirmacionContrasena: 'NuevaClave123!',
      })
      .expect(401);
  });

  it('/api/proyectos crea un proyecto y convierte al creador en Anfitrión', async () => {
    const correo = 'sw1-e2e-cu02-crear@example.test';

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

    const response = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        nombre: 'SW1-E2E-CU02-Proyecto',
        descripcion: 'Proyecto colaborativo de prueba',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      nombre: 'SW1-E2E-CU02-Proyecto',
      descripcion: 'Proyecto colaborativo de prueba',
      estado: 'ACTIVO',
      configuracion: {},
    });

    const filas = await dataSource.query<
      Array<{
        proyecto_id: string;
        rol_nombre: string;
        es_predeterminado: boolean;
        id_usuario: string;
        membresia_estado: string;
      }>
    >(
      `
        SELECT
          p.id AS proyecto_id,
          r.nombre AS rol_nombre,
          r.es_predeterminado,
          m.id_usuario,
          m.estado AS membresia_estado
        FROM proyecto p
        INNER JOIN rol r
          ON r.id_proyecto = p.id
        INNER JOIN membresia m
          ON m.id_proyecto = p.id
          AND m.id_rol = r.id
        WHERE p.id = $1
      `,
      [response.body.id],
    );

    expect(filas).toHaveLength(1);

    expect(filas[0]).toMatchObject({
      proyecto_id: response.body.id,
      rol_nombre: 'Anfitrión',
      es_predeterminado: true,
      id_usuario: registro.body.id,
      membresia_estado: 'ACTIVA',
    });

    const rolesPredeterminados = await dataSource.query<
      Array<{
        nombre: string;
        es_predeterminado: boolean;
      }>
    >(
      `
        SELECT
          nombre,
          es_predeterminado
        FROM rol
        WHERE id_proyecto = $1
        ORDER BY nombre ASC
      `,
      [response.body.id],
    );

    expect(rolesPredeterminados).toEqual([
      {
        nombre: 'Anfitrión',
        es_predeterminado: true,
      },
      {
        nombre: 'Editor',
        es_predeterminado: true,
      },
      {
        nombre: 'Espectador',
        es_predeterminado: true,
      },
    ]);

    const permisosRoles = await dataSource.query<
      Array<{
        rol_nombre: string;
        recurso: string;
        accion: string;
      }>
    >(
      `
        SELECT
          r.nombre AS rol_nombre,
          p.recurso,
          p.accion
        FROM rol r
        INNER JOIN rol_permiso rp
          ON rp.id_rol = r.id
        INNER JOIN permiso p
          ON p.id = rp.id_permiso
        WHERE
          r.id_proyecto = $1
          AND r.nombre IN ('Editor', 'Espectador')
        ORDER BY
          r.nombre ASC,
          p.recurso ASC,
          p.accion ASC
      `,
      [response.body.id],
    );

    expect(permisosRoles).toEqual([
      {
        rol_nombre: 'Editor',
        recurso: 'MODELO',
        accion: 'CONSULTAR',
      },
      {
        rol_nombre: 'Editor',
        recurso: 'MODELO',
        accion: 'EDITAR',
      },
      {
        rol_nombre: 'Editor',
        recurso: 'PARTICIPANTE',
        accion: 'CONSULTAR',
      },
      {
        rol_nombre: 'Editor',
        recurso: 'PROYECTO',
        accion: 'CONSULTAR',
      },
      {
        rol_nombre: 'Editor',
        recurso: 'ROL',
        accion: 'CONSULTAR',
      },
      {
        rol_nombre: 'Espectador',
        recurso: 'MODELO',
        accion: 'CONSULTAR',
      },
      {
        rol_nombre: 'Espectador',
        recurso: 'PARTICIPANTE',
        accion: 'CONSULTAR',
      },
      {
        rol_nombre: 'Espectador',
        recurso: 'PROYECTO',
        accion: 'CONSULTAR',
      },
      {
        rol_nombre: 'Espectador',
        recurso: 'ROL',
        accion: 'CONSULTAR',
      },
    ]);
  });

  it('/api/proyectos rechaza la creación sin autenticación', async () => {
    await request(app.getHttpServer())
      .post('/api/proyectos')
      .send({
        nombre: 'SW1-E2E-Sin-Auth',
      })
      .expect(401);
  });

  it('/api/proyectos permite listar, consultar y modificar un proyecto propio', async () => {
    const correo = 'sw1-e2e-cu02-administrar@example.test';

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

    const token = login.body.accessToken;

    const creacion = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'SW1-E2E-CU02-Administrar',
        descripcion: 'Descripción inicial',
      })
      .expect(201);

    const idProyecto = creacion.body.id;

    const listado = await request(app.getHttpServer())
      .get('/api/proyectos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      listado.body.some(
        (proyecto: { id: string }) => proyecto.id === idProyecto,
      ),
    ).toBe(true);

    const consulta = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(consulta.body).toMatchObject({
      id: idProyecto,
      nombre: 'SW1-E2E-CU02-Administrar',
      descripcion: 'Descripción inicial',
    });

    const modificacion = await request(app.getHttpServer())
      .put(`/api/proyectos/${idProyecto}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'SW1-E2E-CU02-Actualizado',
        descripcion: 'Descripción actualizada',
        configuracion: {
          prueba: true,
        },
      })
      .expect(200);

    expect(modificacion.body).toMatchObject({
      id: idProyecto,
      nombre: 'SW1-E2E-CU02-Actualizado',
      descripcion: 'Descripción actualizada',
      configuracion: {
        prueba: true,
      },
    });

    const filas = await dataSource.query<
      Array<{
        nombre: string;
        rol_nombre: string;
        membresia_estado: string;
      }>
    >(
      `
        SELECT
          p.nombre,
          r.nombre AS rol_nombre,
          m.estado AS membresia_estado
        FROM proyecto p
        INNER JOIN membresia m
          ON m.id_proyecto = p.id
        INNER JOIN rol r
          ON r.id = m.id_rol
          AND r.id_proyecto =
              m.id_proyecto
        WHERE p.id = $1
      `,
      [idProyecto],
    );

    expect(filas).toHaveLength(1);

    expect(filas[0]).toMatchObject({
      nombre: 'SW1-E2E-CU02-Actualizado',
      rol_nombre: 'Anfitrión',
      membresia_estado: 'ACTIVA',
    });
  });

  it('/api/proyectos impide modificar un proyecto a un usuario no autorizado', async () => {
    const contrasena = 'ClaveSegura123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Anfitrion',
        apellido: 'Prueba',
        correo: 'sw1-e2e-cu02-host@example.test',
        contrasena,
      })
      .expect(201);

    const loginHost = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo: 'sw1-e2e-cu02-host@example.test',
        contrasena,
      })
      .expect(200);

    const proyecto = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${loginHost.body.accessToken}`)
      .send({
        nombre: 'SW1-E2E-CU02-Privado',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Otro',
        apellido: 'Usuario',
        correo: 'sw1-e2e-cu02-otro@example.test',
        contrasena,
      })
      .expect(201);

    const loginOtro = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo: 'sw1-e2e-cu02-otro@example.test',
        contrasena,
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/proyectos/${proyecto.body.id}`)
      .set('Authorization', `Bearer ${loginOtro.body.accessToken}`)
      .send({
        nombre: 'SW1-E2E-CU02-No-Permitido',
      })
      .expect(403);
  });

  it('/api/proyectos permite al Anfitrión crear un rol personalizado con permisos', async () => {
    const correo = 'sw1-e2e-cu03-roles@example.test';

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

    const token = login.body.accessToken;

    const proyecto = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'SW1-E2E-CU03-Roles',
      })
      .expect(201);

    const permisos = await request(app.getHttpServer())
      .get(`/api/proyectos/${proyecto.body.id}/permisos`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(permisos.body.length).toBeGreaterThan(0);

    const permisoConsultar = permisos.body.find(
      (permiso: { recurso: string; accion: string }) =>
        permiso.recurso === 'PROYECTO' && permiso.accion === 'CONSULTAR',
    );

    expect(permisoConsultar).toBeDefined();

    const rol = await request(app.getHttpServer())
      .post(`/api/proyectos/${proyecto.body.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Editor UML',
        descripcion: 'Rol personalizado E2E',
        permisosIds: [permisoConsultar.id],
      })
      .expect(201);

    expect(rol.body).toMatchObject({
      nombre: 'Editor UML',
      esPredeterminado: false,
      estado: 'ACTIVO',
      idProyecto: proyecto.body.id,
    });

    const roles = await request(app.getHttpServer())
      .get(`/api/proyectos/${proyecto.body.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      roles.body.some((item: { id: string }) => item.id === rol.body.id),
    ).toBe(true);

    const asociaciones = await dataSource.query<
      Array<{
        recurso: string;
        accion: string;
      }>
    >(
      `
        SELECT
          p.recurso,
          p.accion
        FROM rol_permiso rp
        INNER JOIN permiso p
          ON p.id = rp.id_permiso
        WHERE rp.id_rol = $1
      `,
      [rol.body.id],
    );

    expect(asociaciones).toEqual([
      {
        recurso: 'PROYECTO',
        accion: 'CONSULTAR',
      },
    ]);
  });

  it('/api/proyectos gestiona invitaciones, participantes, roles y permisos particulares', async () => {
    const contrasena = 'ClaveSegura123!';

    const registroHost = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Host',
        apellido: 'CU03',
        correo: 'sw1-e2e-cu03-host@example.test',
        contrasena,
      })
      .expect(201);

    const registroInvitado = await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Invitado',
        apellido: 'CU03',
        correo: 'sw1-e2e-cu03-invitado@example.test',
        contrasena,
      })
      .expect(201);

    const loginHost = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo: 'sw1-e2e-cu03-host@example.test',
        contrasena,
      })
      .expect(200);

    const token = loginHost.body.accessToken;

    const proyecto = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'SW1-E2E-CU03-Participantes',
      })
      .expect(201);

    const idProyecto = proyecto.body.id;

    const permisos = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/permisos`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const permisoConsultarProyecto = permisos.body.find(
      (permiso: { id: string; recurso: string; accion: string }) =>
        permiso.recurso === 'PROYECTO' && permiso.accion === 'CONSULTAR',
    );

    expect(permisoConsultarProyecto).toBeDefined();

    const rolEditor = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Editor CU03 E2E',
        permisosIds: [permisoConsultarProyecto.id],
      })
      .expect(201);

    const invitacion = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/invitaciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        correo: 'sw1-e2e-cu03-invitado@example.test',
        idRol: rolEditor.body.id,
      })
      .expect(201);

    expect(invitacion.body).toMatchObject({
      estado: 'PENDIENTE',
      idProyecto,
      idUsuario: registroInvitado.body.id,
      idRol: rolEditor.body.id,
    });

    expect(invitacion.body).not.toHaveProperty('token');

    await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/invitaciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        correo: 'sw1-e2e-cu03-invitado@example.test',
        idRol: rolEditor.body.id,
      })
      .expect(409);

    /*
     * CU-04 será responsable de aceptar
     * realmente la invitación.
     *
     * Para probar las operaciones de CU-03
     * bajo su precondición de "participante
     * existente", simulamos aquí una
     * invitación ya aceptada.
     */
    await dataSource.query(
      `
      UPDATE invitacion
      SET
        estado = 'ACEPTADA',
        fecha_aceptacion =
          CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [invitacion.body.id],
    );

    const membresias = await dataSource.query<
      Array<{
        id: string;
      }>
    >(
      `
        INSERT INTO membresia (
          id_usuario,
          id_proyecto,
          id_rol
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [registroInvitado.body.id, idProyecto, rolEditor.body.id],
    );

    const idMembresiaInvitado = membresias[0].id;

    const participantes = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/participantes`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      participantes.body.some(
        (participante: { idMembresia: string; correo: string }) =>
          participante.idMembresia === idMembresiaInvitado &&
          participante.correo === 'sw1-e2e-cu03-invitado@example.test',
      ),
    ).toBe(true);

    const rolObservador = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Observador CU03 E2E',
        permisosIds: [permisoConsultarProyecto.id],
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(
        `/api/proyectos/${idProyecto}/participantes/${idMembresiaInvitado}/rol`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({
        idRol: rolObservador.body.id,
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(
        `/api/proyectos/${idProyecto}/participantes/${idMembresiaInvitado}/permisos/${permisoConsultarProyecto.id}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipoAsignacion: 'DENEGAR',
      })
      .expect(200);

    const permisosEfectivos = await request(app.getHttpServer())
      .get(
        `/api/proyectos/${idProyecto}/participantes/${idMembresiaInvitado}/permisos`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const consultarProyecto = permisosEfectivos.body.find(
      (permiso: { idPermiso: string; permitido: boolean; fuente: string }) =>
        permiso.idPermiso === permisoConsultarProyecto.id,
    );

    expect(consultarProyecto).toMatchObject({
      permitido: false,
      fuente: 'DENEGAR',
    });

    await request(app.getHttpServer())
      .delete(
        `/api/proyectos/${idProyecto}/participantes/${idMembresiaInvitado}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const membresiaRetirada = await dataSource.query<
      Array<{
        estado: string;
      }>
    >(
      `
        SELECT estado
        FROM membresia
        WHERE id = $1
      `,
      [idMembresiaInvitado],
    );

    expect(membresiaRetirada[0].estado).toBe('RETIRADA');

    expect(registroHost.body.id).toBeDefined();
  });

  it('/api/invitaciones permite aceptar, rechazar y acceder al proyecto con permisos efectivos', async () => {
    const contrasena = 'ClaveSegura123!';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Host',
        apellido: 'CU04',
        correo: 'sw1-e2e-cu04-host@example.test',
        contrasena,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Invitado',
        apellido: 'CU04',
        correo: 'sw1-e2e-cu04-invitado@example.test',
        contrasena,
      })
      .expect(201);

    const loginHost = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo: 'sw1-e2e-cu04-host@example.test',
        contrasena,
      })
      .expect(200);

    const tokenHost = loginHost.body.accessToken;

    const loginInvitado = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo: 'sw1-e2e-cu04-invitado@example.test',
        contrasena,
      })
      .expect(200);

    const tokenInvitado = loginInvitado.body.accessToken;

    const proyecto = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'SW1-E2E-CU04-Aceptar',
      })
      .expect(201);

    const idProyecto = proyecto.body.id;

    const permisos = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/permisos`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(200);

    const permisoConsultar = permisos.body.find(
      (permiso: { id: string; recurso: string; accion: string }) =>
        permiso.recurso === 'PROYECTO' && permiso.accion === 'CONSULTAR',
    );

    expect(permisoConsultar).toBeDefined();

    const rolInvitado = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/roles`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'Lector CU04 E2E',
        permisosIds: [permisoConsultar.id],
      })
      .expect(201);

    const invitacion = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/invitaciones`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        correo: 'sw1-e2e-cu04-invitado@example.test',
        idRol: rolInvitado.body.id,
      })
      .expect(201);

    /*
     * Antes de aceptar no debe existir
     * acceso al proyecto.
     */
    await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/acceso`)
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(403);

    const recibidas = await request(app.getHttpServer())
      .get('/api/invitaciones')
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(200);

    expect(
      recibidas.body.some(
        (item: { id: string; proyectoNombre: string; rolNombre: string }) =>
          item.id === invitacion.body.id &&
          item.proyectoNombre === 'SW1-E2E-CU04-Aceptar' &&
          item.rolNombre === 'Lector CU04 E2E',
      ),
    ).toBe(true);

    const aceptacion = await request(app.getHttpServer())
      .post(`/api/invitaciones/${invitacion.body.id}/aceptar`)
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(201);

    expect(aceptacion.body).toMatchObject({
      idInvitacion: invitacion.body.id,
      idProyecto,
      idRol: rolInvitado.body.id,
    });

    expect(aceptacion.body.idMembresia).toBeDefined();

    /*
     * Una invitación aceptada no puede
     * aceptarse nuevamente.
     */
    await request(app.getHttpServer())
      .post(`/api/invitaciones/${invitacion.body.id}/aceptar`)
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(409);

    const acceso = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/acceso`)
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(200);

    expect(acceso.body.proyecto).toMatchObject({
      id: idProyecto,
      nombre: 'SW1-E2E-CU04-Aceptar',
      estado: 'ACTIVO',
    });

    expect(acceso.body.rol).toMatchObject({
      id: rolInvitado.body.id,
      nombre: 'Lector CU04 E2E',
      esPredeterminado: false,
    });

    const permisoEfectivo = acceso.body.permisos.find(
      (permiso: { idPermiso: string; permitido: boolean; fuente: string }) =>
        permiso.idPermiso === permisoConsultar.id,
    );

    expect(permisoEfectivo).toMatchObject({
      permitido: true,
      fuente: 'ROL',
    });

    /*
     * Un participante retirado conserva su
     * membresía histórica como RETIRADA,
     * pero debe poder ser invitado otra vez.
     * Al aceptar se reactiva la misma
     * membresía con el rol de la nueva
     * invitación y sin excepciones antiguas.
     */
    await request(app.getHttpServer())
      .put(
        `/api/proyectos/${idProyecto}/participantes/${aceptacion.body.idMembresia}/permisos/${permisoConsultar.id}`,
      )
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        tipoAsignacion: 'DENEGAR',
      })
      .expect(200);

    await request(app.getHttpServer())
      .delete(
        `/api/proyectos/${idProyecto}/participantes/${aceptacion.body.idMembresia}`,
      )
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(204);

    const rolesDisponibles = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/roles`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(200);

    const rolEspectador = rolesDisponibles.body.find(
      (rol: { id: string; nombre: string; esPredeterminado: boolean }) =>
        rol.nombre === 'Espectador' && rol.esPredeterminado === true,
    );

    expect(rolEspectador).toBeDefined();

    const reinvitacion = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/invitaciones`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        correo: 'sw1-e2e-cu04-invitado@example.test',
        idRol: rolEspectador.id,
      })
      .expect(201);

    const reaceptacion = await request(app.getHttpServer())
      .post(`/api/invitaciones/${reinvitacion.body.id}/aceptar`)
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(201);

    expect(reaceptacion.body).toMatchObject({
      idInvitacion: reinvitacion.body.id,
      idProyecto,
      idMembresia: aceptacion.body.idMembresia,
      idRol: rolEspectador.id,
    });

    const excepcionesAnteriores = await dataSource.query<
      Array<{ cantidad: string }>
    >(
      `
        SELECT COUNT(*)::text AS cantidad
        FROM permiso_membresia
        WHERE id_membresia = $1
      `,
      [aceptacion.body.idMembresia],
    );

    expect(excepcionesAnteriores[0].cantidad).toBe('0');

    const accesoReincorporado = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/acceso`)
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(200);

    expect(accesoReincorporado.body.rol).toMatchObject({
      id: rolEspectador.id,
      nombre: 'Espectador',
      esPredeterminado: true,
    });

    /*
     * Probamos también rechazo usando un
     * segundo proyecto, porque el mismo
     * usuario ya es miembro del primero.
     */
    const proyectoRechazo = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'SW1-E2E-CU04-Rechazar',
      })
      .expect(201);

    const rolesRechazo = await request(app.getHttpServer())
      .get(`/api/proyectos/${proyectoRechazo.body.id}/roles`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(200);

    /*
     * Creamos un rol asignable.
     */
    const permisosRechazo = await request(app.getHttpServer())
      .get(`/api/proyectos/${proyectoRechazo.body.id}/permisos`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(200);

    const permisoRechazo = permisosRechazo.body.find(
      (permiso: { id: string; recurso: string; accion: string }) =>
        permiso.recurso === 'PROYECTO' && permiso.accion === 'CONSULTAR',
    );

    const rolRechazo = await request(app.getHttpServer())
      .post(`/api/proyectos/${proyectoRechazo.body.id}/roles`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'Rol rechazo CU04',
        permisosIds: [permisoRechazo.id],
      })
      .expect(201);

    expect(rolesRechazo.body.length).toBeGreaterThan(0);

    const invitacionRechazo = await request(app.getHttpServer())
      .post(`/api/proyectos/${proyectoRechazo.body.id}/invitaciones`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        correo: 'sw1-e2e-cu04-invitado@example.test',
        idRol: rolRechazo.body.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/invitaciones/${invitacionRechazo.body.id}/rechazar`)
      .set('Authorization', `Bearer ${tokenInvitado}`)
      .expect(201);

    const membresiaRechazada = await dataSource.query<
      Array<{
        cantidad: string;
      }>
    >(
      `
        SELECT COUNT(*)::text
          AS cantidad
        FROM membresia
        WHERE
          id_usuario = (
            SELECT id
            FROM usuario
            WHERE correo =
              'sw1-e2e-cu04-invitado@example.test'
          )
          AND id_proyecto = $1
      `,
      [proyectoRechazo.body.id],
    );

    expect(membresiaRechazada[0].cantidad).toBe('0');
  });

  it('/api/proyectos/:idProyecto/modelos-uml permite crear, guardar, recuperar y autorizar modelos UML', async () => {
    const contrasena = 'ClaveSegura123!';
    const correoHost = 'sw1-e2e-cu05-host@example.test';
    const correoLector = 'sw1-e2e-cu05-lector@example.test';

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Host',
        apellido: 'CU05',
        correo: correoHost,
        contrasena,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/registro')
      .send({
        nombre: 'Lector',
        apellido: 'CU05',
        correo: correoLector,
        contrasena,
      })
      .expect(201);

    const loginHost = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ correo: correoHost, contrasena })
      .expect(200);

    const loginLector = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ correo: correoLector, contrasena })
      .expect(200);

    const tokenHost = loginHost.body.accessToken;
    const tokenLector = loginLector.body.accessToken;

    const proyecto = await request(app.getHttpServer())
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'SW1-E2E-CU05-Modelado',
        descripcion: 'Proyecto E2E para CU-05',
      })
      .expect(201);

    const idProyecto = proyecto.body.id as string;

    const creado = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/modelos-uml`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'Modelo de dominio',
        descripcion: 'Modelo inicial',
      })
      .expect(201);

    expect(creado.body).toMatchObject({
      nombre: 'Modelo de dominio',
      descripcion: 'Modelo inicial',
      version: 1,
      estado: 'ACTIVO',
      idProyecto,
      contenido: {
        versionEsquema: 1,
        clases: [],
        relaciones: [],
        configuracion: {},
      },
    });

    const idModelo = creado.body.id as string;
    const idCliente = randomUUID();
    const idPedido = randomUUID();
    const idClientePk = randomUUID();
    const idPedidoPk = randomUUID();

    const contenido = {
      versionEsquema: 1,
      configuracion: {},
      clases: [
        {
          id: idCliente,
          nombre: 'Cliente',
          posicion: { x: 100, y: 80 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: idClientePk,
          },
          atributos: [
            {
              id: idClientePk,
              nombre: 'id',
              tipo: 'Long',
              visibilidad: 'PRIVADA',
            },
            {
              id: randomUUID(),
              nombre: 'nombre',
              tipo: 'String',
              visibilidad: 'PRIVADA',
            },
          ],
          operaciones: [
            {
              id: randomUUID(),
              nombre: 'buscarPedido',
              visibilidad: 'PUBLICA',
              tipoRetorno: 'Pedido',
              parametros: [
                {
                  id: randomUUID(),
                  nombre: 'idPedido',
                  tipo: 'Long',
                },
              ],
            },
          ],
        },
        {
          id: idPedido,
          nombre: 'Pedido',
          posicion: { x: 520, y: 80 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: idPedidoPk,
          },
          atributos: [
            {
              id: idPedidoPk,
              nombre: 'id',
              tipo: 'Long',
              visibilidad: 'PRIVADA',
            },
          ],
          operaciones: [],
        },
      ],
      relaciones: [
        {
          id: randomUUID(),
          tipo: 'ASOCIACION',
          idClaseOrigen: idCliente,
          idClaseDestino: idPedido,
          nombre: 'pedidos',
          multiplicidadOrigen: '1',
          multiplicidadDestino: '0..*',
        },
      ],
    };

    const guardado = await request(app.getHttpServer())
      .put(`/api/proyectos/${idProyecto}/modelos-uml/${idModelo}`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'Modelo de dominio actualizado',
        descripcion: 'Contiene Cliente y Pedido',
        contenido,
        version: 1,
      })
      .expect(200);

    expect(guardado.body).toMatchObject({
      id: idModelo,
      nombre: 'Modelo de dominio actualizado',
      version: 2,
      contenido,
    });

    const recuperado = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/modelos-uml/${idModelo}`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(200);

    expect(recuperado.body).toMatchObject({
      id: idModelo,
      version: 2,
      contenido,
    });

    const listado = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/modelos-uml`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(200);

    expect(listado.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: idModelo,
          nombre: 'Modelo de dominio actualizado',
          version: 2,
        }),
      ]),
    );

    expect(listado.body[0]).not.toHaveProperty('contenido');

    await request(app.getHttpServer())
      .put(`/api/proyectos/${idProyecto}/modelos-uml/${idModelo}`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'Guardado obsoleto',
        contenido,
        version: 1,
      })
      .expect(409);

    const contenidoInvalido = {
      ...contenido,
      relaciones: [
        {
          id: randomUUID(),
          tipo: 'ASOCIACION',
          idClaseOrigen: idCliente,
          idClaseDestino: randomUUID(),
          nombre: null,
          multiplicidadOrigen: '1',
          multiplicidadDestino: '0..*',
        },
      ],
    };

    await request(app.getHttpServer())
      .put(`/api/proyectos/${idProyecto}/modelos-uml/${idModelo}`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'Modelo inválido',
        contenido: contenidoInvalido,
        version: 2,
      })
      .expect(400);

    const permisos = await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/permisos`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .expect(200);

    const permisoConsultarModelo = permisos.body.find(
      (permiso: { id: string; recurso: string; accion: string }) =>
        permiso.recurso === 'MODELO' && permiso.accion === 'CONSULTAR',
    );

    expect(permisoConsultarModelo).toBeDefined();

    const rolLector = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/roles`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        nombre: 'Lector UML CU05',
        permisosIds: [permisoConsultarModelo.id],
      })
      .expect(201);

    const invitacion = await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/invitaciones`)
      .set('Authorization', `Bearer ${tokenHost}`)
      .send({
        correo: correoLector,
        idRol: rolLector.body.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/invitaciones/${invitacion.body.id}/aceptar`)
      .set('Authorization', `Bearer ${tokenLector}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/proyectos/${idProyecto}/modelos-uml/${idModelo}`)
      .set('Authorization', `Bearer ${tokenLector}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/proyectos/${idProyecto}/modelos-uml`)
      .set('Authorization', `Bearer ${tokenLector}`)
      .send({ nombre: 'Modelo no autorizado' })
      .expect(403);

    const persistido = await dataSource.query<
      Array<{
        version: number;
        contenido: typeof contenido;
      }>
    >(
      `
        SELECT version, contenido
        FROM modelo_uml
        WHERE id = $1
      `,
      [idModelo],
    );

    expect(persistido).toHaveLength(1);
    expect(persistido[0].version).toBe(2);
    expect(persistido[0].contenido).toEqual(contenido);
  });
});
