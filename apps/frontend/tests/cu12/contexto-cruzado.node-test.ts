import test from 'node:test';
import assert from 'node:assert/strict';
import { actualizarFuentesContexto, MAX_FUENTES_CONTEXTO } from '../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/helpers/seleccion-contexto.ts';

const actual = 'chat-actual';

test('CU12 RF-46: sin selección expresa no incorpora otras conversaciones', () => {
  assert.deepEqual(actualizarFuentesContexto([], actual, true, actual), []);
  assert.equal(MAX_FUENTES_CONTEXTO, 3);
});

test('CU12 RF-46: selección explícita añade fuentes sin duplicarlas', () => {
  const inicial = actualizarFuentesContexto([], 'a', true, actual);
  assert.deepEqual(actualizarFuentesContexto(inicial, 'a', true, actual), ['a']);
  assert.deepEqual(actualizarFuentesContexto(inicial, 'b', true, actual), ['a', 'b']);
});

test('CU12 RF-46: máximo tres fuentes y nunca el chat actual', () => {
  const tres = ['a', 'b', 'c'];
  assert.deepEqual(actualizarFuentesContexto(tres, 'd', true, actual), tres);
  assert.deepEqual(actualizarFuentesContexto(tres, actual, true, actual), tres);
});

test('CU12 RF-46: se puede revocar una selección sin afectar las demás', () => {
  assert.deepEqual(actualizarFuentesContexto(['a','b'], 'a', false, actual), ['b']);
});
