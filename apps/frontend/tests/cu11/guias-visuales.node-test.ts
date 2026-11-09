import assert from 'node:assert/strict';
import test from 'node:test';
import { guiaPorId } from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/guias-aprendizaje.ts';
import { controlesVisualesDePaso, limitarPosicionPanel } from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/guias-visuales.ts';
import { ESTADO_APRENDIZAJE_INICIAL } from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/estado-aprendizaje.ts';

test('CU11 bloque 10.2: guía de conversaciones señala editor y las cuatro acciones de envío', () => {
  const paso = guiaPorId('conversaciones')!.pasos[2];
  assert.deepEqual(controlesVisualesDePaso(paso).map((control) => control.id), [
    'editor-conversacion', 'enviar-equipo', 'consultar-ia', 'analizar-uml', 'proponer-uml',
  ]);
});

test('CU11 bloque 10.2: cada pista tiene un título y una explicación local', () => {
  const paso = guiaPorId('conversaciones')!.pasos[2];
  for (const control of controlesVisualesDePaso(paso)) {
    assert.ok(control.titulo.length > 3);
    assert.ok(control.explicacion.length > 10);
  }
});

test('CU11 bloque 10.2: múltiples controles no duplican elementos', () => {
  const controles = controlesVisualesDePaso({
    titulo: 'Prueba', indicacion: 'Prueba', orientacion: 'Prueba', requisito: 'AUTENTICADO',
    control: 'consultar-ia', controlesAdicionales: ['consultar-ia', 'enviar-equipo', 'enviar-equipo'],
  });
  assert.deepEqual(controles.map((control) => control.id), ['consultar-ia', 'enviar-equipo']);
});

test('CU11 bloque 10.2: las guías sin control siguen siendo válidas', () => {
  assert.deepEqual(controlesVisualesDePaso({ titulo: 'T', indicacion: 'I', orientacion: 'O', requisito: 'AUTENTICADO' }), []);
});

test('CU11 bloque 10.2: posicion inicial se conserva como opcional y no desplaza la guía', () => {
  assert.equal(ESTADO_APRENDIZAJE_INICIAL.posicionPanel, null);
});

test('CU11 bloque 10.2: arrastre dentro del viewport conserva la posición', () => {
  assert.deepEqual(limitarPosicionPanel({ x: 250, y: 100 }, { width: 425, height: 400 }, { width: 1280, height: 900 }), { x: 250, y: 100 });
});

test('CU11 bloque 10.2: arrastre negativo no oculta el encabezado', () => {
  assert.deepEqual(limitarPosicionPanel({ x: -400, y: -200 }, { width: 425, height: 400 }, { width: 1280, height: 900 }), { x: 8, y: 8 });
});

test('CU11 bloque 10.2: el panel no desaparece por los bordes derecho e inferior', () => {
  assert.deepEqual(limitarPosicionPanel({ x: 2000, y: 900 }, { width: 425, height: 400 }, { width: 1280, height: 900 }), { x: 847, y: 492 });
});

test('CU11 bloque 10.2: panel mayor que ventana mantiene el asa accesible', () => {
  assert.deepEqual(limitarPosicionPanel({ x: 500, y: 500 }, { width: 900, height: 900 }, { width: 600, height: 500 }), { x: 8, y: 8 });
});

test('CU11 bloque 10.2: valores no finitos no dañan la posición', () => {
  assert.deepEqual(limitarPosicionPanel({ x: Number.NaN, y: Infinity }, { width: 425, height: 400 }, { width: 1280, height: 900 }), { x: 8, y: 8 });
});
