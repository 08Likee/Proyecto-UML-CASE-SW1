import assert from 'node:assert/strict';
import test from 'node:test';
import { guiaPorId } from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/guias-aprendizaje.ts';
import {
  claveSenalizacionInicial,
  controlesVisualesDePaso,
  limitarPosicionPanel,
  puedeSenalizarPorPrimeraVez,
  seSuperponenRectangulos,
  ubicarEtiquetaAprendizaje,
} from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/guias-visuales.ts';
import { ESTADO_APRENDIZAJE_INICIAL } from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/estado-aprendizaje.ts';

test('CU11 bloque 10.3: primer paso autorizado admite señalización automática', () => {
  const paso = guiaPorId('conversaciones')!.pasos[2];
  assert.equal(puedeSenalizarPorPrimeraVez(paso, null, false), true);
});

test('CU11 bloque 10.3: no repite automáticamente la señalización ya vista', () => {
  const paso = guiaPorId('conversaciones')!.pasos[2];
  assert.equal(puedeSenalizarPorPrimeraVez(paso, null, true), false);
  assert.deepEqual(ESTADO_APRENDIZAJE_INICIAL.pasosAutoSenalados, []);
});

test('CU11 bloque 10.3: la señalización nunca evita las restricciones de acceso', () => {
  const paso = guiaPorId('crear-clase')!.pasos[2];
  assert.equal(puedeSenalizarPorPrimeraVez(paso, 'Necesitás MODELO / EDITAR', false), false);
});

test('CU11 bloque 10.3: no señala pasos sin un control objetivo', () => {
  assert.equal(puedeSenalizarPorPrimeraVez(undefined, null, false), false);
  assert.equal(puedeSenalizarPorPrimeraVez({ titulo: 'T', indicacion: 'I', orientacion: 'O', requisito: 'AUTENTICADO' }, null, false), false);
});

test('CU11 bloque 10.3: la clave distingue pasos y guías distintas', () => {
  assert.notEqual(claveSenalizacionInicial('conversaciones', 1), claveSenalizacionInicial('conversaciones', 2));
  assert.notEqual(claveSenalizacionInicial('conversaciones', 1), claveSenalizacionInicial('propuestas-ia', 1));
});

test('CU11 bloque 10.3: el recorrido conserva la lista de cinco controles', () => {
  assert.equal(controlesVisualesDePaso(guiaPorId('conversaciones')!.pasos[2]).length, 5);
});

test('CU11 bloque 10.3: móvil permite desplazar el panel sin perder la cabecera', () => {
  assert.deepEqual(limitarPosicionPanel({ x: 400, y: 900 }, { width: 366, height: 450 }, { width: 390, height: 780 }), { x: 16, y: 322 });
  assert.deepEqual(limitarPosicionPanel({ x: -200, y: -10 }, { width: 366, height: 450 }, { width: 390, height: 780 }), { x: 8, y: 8 });
});

test('CU11 bloque 10.3: detecta superposición parcial de panel y destino', () => {
  const panel = { x: 40, y: 40, width: 290, height: 340 };
  assert.equal(seSuperponenRectangulos(panel, { x: 320, y: 200, width: 100, height: 35 }), true);
  assert.equal(seSuperponenRectangulos(panel, { x: 350, y: 200, width: 100, height: 35 }), false);
});

test('CU11 bloque 10.3: etiqueta utiliza zona superior cuando está libre', () => {
  assert.deepEqual(ubicarEtiquetaAprendizaje(
    { x: 400, y: 300, width: 150, height: 40 }, { width: 900, height: 700 }, [], 150,
  ), { x: 400, y: 260, width: 150, height: 30, lado: 'arriba' });
});

test('CU11 bloque 10.3: evita el panel y sitúa la etiqueta debajo del control', () => {
  const panel = { x: 340, y: 90, width: 280, height: 120 };
  const etiqueta = ubicarEtiquetaAprendizaje(
    { x: 400, y: 240, width: 120, height: 35 }, { width: 900, height: 700 }, [panel], 150,
  );
  assert.equal(etiqueta?.lado, 'abajo');
  assert.ok(etiqueta && !seSuperponenRectangulos(etiqueta, panel));
});

test('CU11 bloque 10.3: varias etiquetas no ocupan el mismo espacio', () => {
  const pantalla = { width: 900, height: 700 };
  const control = { x: 400, y: 300, width: 100, height: 32 };
  const primera = ubicarEtiquetaAprendizaje(control, pantalla, [], 150)!;
  const segunda = ubicarEtiquetaAprendizaje(control, pantalla, [primera], 150)!;
  assert.ok(primera && segunda);
  assert.equal(seSuperponenRectangulos(primera, segunda), false);
});

test('CU11 bloque 10.3: omite etiquetas si solo se podrían colocar fuera de pantalla', () => {
  const resultado = ubicarEtiquetaAprendizaje(
    { x: 4, y: 4, width: 286, height: 172 }, { width: 300, height: 180 }, [], 150,
  );
  assert.equal(resultado, null);
});
