import assert from 'node:assert/strict';
import test from 'node:test';
import { prevalidarRelacionIncompleta } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/prevalidar-relacion-incompleta.ts';

test('CU09 bloque 11.2: asociación entre dos clases exige sentido y ambas multiplicidades sin WebGPU', () => {
  const aviso = prevalidarRelacionIncompleta('Crea una asociación entre Venta y Producto.', false);
  assert.ok(aviso);
  assert.match(aviso, /No se creó ninguna relación/);
  assert.match(aviso, /origen/);
  assert.match(aviso, /destino/);
  assert.match(aviso, /multiplicidad/);
  assert.match(aviso, /Venta/);
  assert.match(aviso, /Producto/);
});

test('CU09 bloque 11.2: orden con sentido pero sin multiplicidades devuelve aviso local', () => {
  const aviso = prevalidarRelacionIncompleta('Crear una asociación de Venta hacia Producto.', false);
  assert.ok(aviso);
  assert.match(aviso, /multiplicidades de origen y de destino/);
});

test('CU09 bloque 11.2: composición y agregación incompletas no inventan todo ni parte', () => {
  for (const tipo of ['composición', 'agregación']) {
    const aviso = prevalidarRelacionIncompleta(`Crea una ${tipo} entre Pedido y Item.`, false);
    assert.ok(aviso);
    assert.match(aviso, /todo/);
    assert.match(aviso, /parte/);
    assert.match(aviso, /multiplicidades/);
  }
});

test('CU09 bloque 11.2: instrucciones completas conservan el intérprete habitual', () => {
  assert.equal(prevalidarRelacionIncompleta('Crea una asociación de Venta hacia Producto con multiplicidad de origen 1 y de destino 0..*.', false), null);
  assert.equal(prevalidarRelacionIncompleta('Crea una composición donde Pedido es el todo y Item es la parte, con multiplicidad de origen 1 y de destino 0..*.', false), null);
});

test('CU09 bloque 11.2: consultas y órdenes compuestas nunca se reinterpretan como incompletas sencillas', () => {
  for (const texto of [
    '¿Qué asociación conviene entre Venta y Producto?',
    'Crea una asociación entre Venta y Producto y elimina la clase Cliente.',
    'Crea una asociación entre Venta y Producto con condiciones.',
    'Crea una asociación entre Venta y Producto; borra Cliente.',
  ]) assert.equal(prevalidarRelacionIncompleta(texto, false), null, texto);
});

test('CU09 bloque 11.2: no interviene cuando hay una instrucción pendiente', () => {
  assert.equal(prevalidarRelacionIncompleta('Crea una asociación entre Venta y Producto.', true), null);
});

test('CU09 bloque 11.2: soporta espacios alrededor y tildes en los nombres', () => {
  assert.ok(prevalidarRelacionIncompleta('  Crear una asociación entre Atención y Área. ', false));
});
