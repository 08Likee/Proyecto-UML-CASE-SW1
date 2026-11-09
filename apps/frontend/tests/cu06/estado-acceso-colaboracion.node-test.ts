import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiHttpError } from '../../src/shared/api/api-http-error.ts';
import {
  admiteModoOffline,
  esAccesoRevocadoHttp,
  esRechazoAutorizacionColaborativa,
} from '../../src/features/pa02-modelado-interoperabilidad-uml/cu06-editar-diagrama-colaborativamente/hooks/estado-acceso-colaboracion.ts';

test('CU-06 / 13.2: revocación real por 401/403/404/410 impide modo offline', () => {
  for (const status of [401, 403, 404, 410]) {
    assert.equal(esAccesoRevocadoHttp(new ApiHttpError('Sin autorización', status)), true);
    assert.equal(admiteModoOffline('desconectado', true, true, null), false);
  }
});

test('CU-06 / 13.2: error temporal de red y error 500 no se confunden con revocación', () => {
  assert.equal(esAccesoRevocadoHttp(new TypeError('Failed to fetch')), false);
  assert.equal(esAccesoRevocadoHttp(new ApiHttpError('Error del servidor', 500)), false);
  assert.equal(admiteModoOffline('desconectado', true, false, null), true);
  assert.equal(admiteModoOffline('conectado', true, false, null), false);
  assert.equal(admiteModoOffline('desconectado', false, false, null), false);
});

test('CU-06 / 13.2: autenticación rechazada no ofrece falsa promesa de sincronización offline', () => {
  assert.equal(admiteModoOffline('desconectado', true, false, 'Credenciales inválidas'), false);
  assert.equal(esRechazoAutorizacionColaborativa('HTTP 403: usuario no autorizado'), true);
  assert.equal(esRechazoAutorizacionColaborativa('El modelo UML no existe o no se encuentra disponible'), true);
  assert.equal(esRechazoAutorizacionColaborativa('El usuario no posee autorización para realizar esta operación'), true);
  assert.equal(esRechazoAutorizacionColaborativa('WebSocket disconnected, Failed to fetch'), false);
});
