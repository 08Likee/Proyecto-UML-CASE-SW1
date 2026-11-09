import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DURACION_SENALES_CU11_MS,
  debeOcultarSenalesPorInteraccion,
  claveSenalizacionInicial,
  puedeSenalizarPorPrimeraVez,
} from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/guias-visuales.ts';
import { guiaPorId } from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/guias-aprendizaje.ts';

test('CU11 bloque 10.4: duración máxima establecida en cinco segundos', () => {
  assert.equal(DURACION_SENALES_CU11_MS, 5000);
});

test('CU11 bloque 10.4: pulsar otro control de la aplicación oculta las marcas', () => {
  assert.equal(debeOcultarSenalesPorInteraccion('pointerdown', false), true);
});

test('CU11 bloque 10.4: comenzar a escribir fuera del panel oculta las marcas', () => {
  assert.equal(debeOcultarSenalesPorInteraccion('keydown', false, 'H'), true);
  assert.equal(debeOcultarSenalesPorInteraccion('input', false), true);
});

test('CU11 bloque 10.4: usar los controles de la guía no descarta las marcas', () => {
  assert.equal(debeOcultarSenalesPorInteraccion('pointerdown', true), false);
  assert.equal(debeOcultarSenalesPorInteraccion('keydown', true, 'ArrowRight'), false);
  assert.equal(debeOcultarSenalesPorInteraccion('input', true), false);
});

test('CU11 bloque 10.4: Escape descarta las marcas desde dentro o fuera', () => {
  assert.equal(debeOcultarSenalesPorInteraccion('keydown', true, 'Escape'), true);
  assert.equal(debeOcultarSenalesPorInteraccion('keydown', false, 'Escape'), true);
});

test('CU11 bloque 10.4: eventos pasivos y programáticos no apagan la señalización', () => {
  for (const evento of ['scroll', 'resize', 'mousemove', 'focusin', 'change']) {
    assert.equal(debeOcultarSenalesPorInteraccion(evento, false), false, evento);
  }
});

test('CU11 bloque 10.4: se conserva la señalización inicial por paso autorizado', () => {
  const paso = guiaPorId('conversaciones')!.pasos[2];
  assert.ok(claveSenalizacionInicial('conversaciones', 2));
  assert.equal(puedeSenalizarPorPrimeraVez(paso, null, false), true);
  assert.equal(puedeSenalizarPorPrimeraVez(paso, null, true), false);
  assert.equal(puedeSenalizarPorPrimeraVez(paso, 'Acceso denegado', false), false);
});
