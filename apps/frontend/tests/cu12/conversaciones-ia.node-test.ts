import assert from 'node:assert/strict';
import test from 'node:test';
import { elegirConversacionInicial, encontrarPropuestaDeMensajeIa, unirConversaciones, unirMensajes } from '../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/helpers/conversaciones-ia.helpers.ts';
import type { ConversacionIa, MensajeIa } from '../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/types/conversaciones-ia.types.ts';

function mensaje(id: string, contenido: string, fechaCreacion: string): MensajeIa {
  return {
    id, contenido, fechaCreacion,
    tipoEmisor: 'USUARIO', identificadorSolicitud: `req-${id}`,
    idConversacion: 'c1', idUsuario: 'u1',
  };
}
function conversacion(id: string, fechaActualizacion: string, estado: ConversacionIa['estado']): ConversacionIa {
  return {
    id, titulo: id, fechaActualizacion, estado,
    fechaCreacion: '2026-11-01T00:00:00.000Z', idProyecto: 'p1', idCreador: 'u1',
  };
}

test('CU12 frontend: mensajes de dos usuarios con mismo contenido conservan IDs diferentes', () => {
  const a = mensaje('m1', 'Hola', '2026-11-04T10:00:00.000Z');
  const b = mensaje('m2', 'Hola', '2026-11-04T10:00:01.000Z');
  assert.deepEqual(unirMensajes([a], [b]).map(({ id }) => id), ['m1', 'm2']);
});

test('CU12 frontend: polling no duplica mensajes ya recibidos', () => {
  const a = mensaje('m1', 'Uno', '2026-11-04T10:00:00.000Z');
  assert.equal(unirMensajes([a], [a]).length, 1);
});

test('CU12 frontend: nueva respuesta del backend actualiza un mensaje identificado por UUID', () => {
  const a = mensaje('m1', 'A', '2026-11-04T10:00:00.000Z');
  const actualizado = { ...a, contenido: 'A corregido' };
  assert.equal(unirMensajes([a], [actualizado])[0].contenido, 'A corregido');
});

test('CU12 frontend: páginas antiguas y nuevas se ordenan por fecha', () => {
  const nuevo = mensaje('m2', 'Nuevo', '2026-11-04T10:00:01.000Z');
  const antiguo = mensaje('m1', 'Antiguo', '2026-11-04T10:00:00.000Z');
  assert.deepEqual(unirMensajes([nuevo], [antiguo]).map(({ id }) => id), ['m1', 'm2']);
});

test('CU12 frontend: archivar actualiza la conversación sin duplicarla', () => {
  const activa = conversacion('c1', '2026-11-04T10:00:00.000Z', 'ACTIVA');
  const archivada = { ...activa, estado: 'ARCHIVADA' as const };
  const resultado = unirConversaciones([activa], [archivada]);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].estado, 'ARCHIVADA');
});

test('CU12 frontend: lista reordena por última actualización y no duplica UUID', () => {
  const anterior = conversacion('c1', '2026-11-04T10:00:00.000Z', 'ACTIVA');
  const ultima = conversacion('c2', '2026-11-04T11:00:00.000Z', 'ACTIVA');
  assert.deepEqual(unirConversaciones([anterior], [anterior, ultima]).map(({ id }) => id), ['c2', 'c1']);
});


test('CU09+CU12 frontend: respuesta IA se conserva como mensaje diferente aunque comparta solicitud', () => {
  const humano = mensaje('humano', 'Consulta', '2026-11-05T10:00:00.000Z');
  const ia: MensajeIa = {
    ...humano,
    id: 'respuesta-ia',
    contenido: 'Respuesta de IA',
    tipoEmisor: 'IA',
    idUsuario: null,
    fechaCreacion: '2026-11-05T10:00:02.000Z',
  };
  const lista = unirMensajes([humano], [ia, humano]);
  assert.equal(lista.length, 2);
  assert.deepEqual(lista.map((m) => m.id), ['humano', 'respuesta-ia']);
  assert.equal(lista[0].identificadorSolicitud, lista[1].identificadorSolicitud);
});


test('CU12 diagramador: al reabrir, conserva una conversación válida del proyecto', () => {
  const lista = [
    conversacion('activa', '2026-11-05T10:00:00.000Z', 'ACTIVA'),
    conversacion('archivada', '2026-11-04T10:00:00.000Z', 'ARCHIVADA'),
  ];
  assert.equal(elegirConversacionInicial(lista, 'archivada'), 'archivada');
});

test('CU12 diagramador: una conversación ajena o inexistente no se selecciona', () => {
  const lista = [conversacion('permitida', '2026-11-05T10:00:00.000Z', 'ACTIVA')];
  assert.equal(elegirConversacionInicial(lista, 'id-de-otro-proyecto'), 'permitida');
  assert.equal(elegirConversacionInicial([], 'id-de-otro-proyecto'), null);
});

test('CU12 bloque 8.3: nueva conversación queda seleccionada de inmediato y no se duplica', () => {
  const previa = conversacion('anterior', '2026-11-06T01:00:00.000Z', 'ACTIVA');
  const creada = conversacion('nueva', '2026-11-06T01:10:00.000Z', 'ACTIVA');
  const lista = unirConversaciones([previa], [creada]);
  assert.equal(lista.length, 2);
  assert.equal(elegirConversacionInicial(lista, creada.id), creada.id);
});

test('CU13 bloque 8.3: el estado actual de propuestas se vincula al mensaje IA sin reescribirlo', () => {
  const id = '58f82209-c958-40ab-bb6d-8c24a40715bd';
  const original = `**Propuesta UML registrada para modelo (v15)**\n\n**Identificador:** \`${id}\`. No se modificó el UML.`;
  const propuesta = { id, estado: 'APLICADA' as const, versionActual: 16 };
  assert.equal(encontrarPropuestaDeMensajeIa(original, [propuesta])?.estado, 'APLICADA');
  assert.equal(encontrarPropuestaDeMensajeIa(original, [{ ...propuesta, estado: 'RECHAZADA' }])?.estado, 'RECHAZADA');
  assert.equal(encontrarPropuestaDeMensajeIa('Otra respuesta de IA', [propuesta]), null);
  assert.ok(original.includes('No se modificó el UML'));
});
