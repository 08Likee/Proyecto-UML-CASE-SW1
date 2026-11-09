import assert from 'node:assert/strict';
import test from 'node:test';
import { prepararTraspasoOrdenUml } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/preparar-traspaso-orden-uml.ts';

const valido = {
  idModeloAbierto: 'modelo-actual',
  puedeEditarModelo: true,
  modeloSincronizado: true,
  conversacionActiva: true,
  accesoDisponible: true,
  procesando: false,
  vozInactiva: true,
};

test('CU09 bloque 11.1: transfiere el borrador revisable sin interpretarlo', () => {
  assert.equal(prepararTraspasoOrdenUml('  Crea la clase Factura.  ', valido), 'Crea la clase Factura.');
});

test('CU09 bloque 11.1: espectador no puede iniciar ejecución desde el chat', () => {
  assert.equal(prepararTraspasoOrdenUml('Crea la clase Factura.', { ...valido, puedeEditarModelo: false }), null);
});

test('CU09 bloque 11.1: requiere modelo abierto y sincronizado', () => {
  assert.equal(prepararTraspasoOrdenUml('Crea la clase Factura.', { ...valido, idModeloAbierto: undefined }), null);
  assert.equal(prepararTraspasoOrdenUml('Crea la clase Factura.', { ...valido, modeloSincronizado: false }), null);
});

test('CU09 bloque 11.1: conversación archivada o sin acceso no transfiere', () => {
  assert.equal(prepararTraspasoOrdenUml('Crea la clase Factura.', { ...valido, conversacionActiva: false }), null);
  assert.equal(prepararTraspasoOrdenUml('Crea la clase Factura.', { ...valido, accesoDisponible: false }), null);
});

test('CU09 bloque 11.1: no transfiere mientras se graba o envía', () => {
  assert.equal(prepararTraspasoOrdenUml('Crea la clase Factura.', { ...valido, vozInactiva: false }), null);
  assert.equal(prepararTraspasoOrdenUml('Crea la clase Factura.', { ...valido, procesando: true }), null);
});

test('CU09 bloque 11.1: exige una instrucción no vacía y máximo 8000 caracteres', () => {
  assert.equal(prepararTraspasoOrdenUml(' \n ', valido), null);
  assert.equal(prepararTraspasoOrdenUml('x'.repeat(8001), valido), null);
  assert.equal(prepararTraspasoOrdenUml('x'.repeat(8000), valido)?.length, 8000);
});
