import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectarAtributoIncompleto, completarAtributoIncompleto } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/prevalidar-atributo-incompleto.ts';
import { ejecutarIntencionSobreModelo } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/ejecutar-intencion-modelo.ts';
import type { ModeloUmlContenido } from '../../src/features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types.ts';

function modelo(): ModeloUmlContenido {
  return { versionEsquema: 1, configuracion: {}, relaciones: [], clases: [
    { id: 'c1', nombre: 'Prueba09', posicion: {x: 0, y:0}, atributos: [], operaciones: [], persistencia: { persistente:false, idAtributoIdentificador:null } },
  ] };
}

test('pregunta por el tipo faltante y acepta String sin usar WebLLM', () => {
  const actual = modelo();
  const original = structuredClone(actual);
  const pendiente = detectarAtributoIncompleto('agrega atributo nombre a la clase Prueba09', actual);
  assert.equal(pendiente?.estado, 'PREGUNTAR');
  if (pendiente?.estado !== 'PREGUNTAR') return;
  assert.match(pendiente.pregunta, /tipo.*nombre/i);
  const completada = completarAtributoIncompleto('string', actual, pendiente.contexto);
  assert.equal(completada.estado, 'LISTA');
  if (completada.estado !== 'LISTA') return;
  const ejecutada = ejecutarIntencionSobreModelo(actual, completada.intencion);
  assert.equal(ejecutada.exito, true);
  if (ejecutada.exito) assert.deepEqual(ejecutada.contenido.clases[0].atributos.map(a => [a.nombre,a.tipo]), [['nombre','String']]);
  assert.deepEqual(actual, original, 'el original no debe mutar');
});

test('pregunta por nombre y tipo y admite la respuesta explícita en una frase', () => {
  const actual = modelo();
  const pendiente = detectarAtributoIncompleto('Agrega un atributo a la clase Prueba09.', actual);
  assert.equal(pendiente?.estado, 'PREGUNTAR');
  if (pendiente?.estado !== 'PREGUNTAR') return;
  const completada = completarAtributoIncompleto('nombre: edad, tipo: integer', actual, pendiente.contexto);
  assert.equal(completada.estado, 'LISTA');
  if (completada.estado !== 'LISTA') return;
  const ejecutada = ejecutarIntencionSobreModelo(actual, completada.intencion);
  assert.equal(ejecutada.exito, true);
  if (ejecutada.exito) assert.equal(ejecutada.contenido.clases[0].atributos[0].tipo, 'Integer');
});

test('permite completar nombre y tipo en dos respuestas cortas', () => {
  const actual = modelo();
  const pendiente = detectarAtributoIncompleto('Agrega un atributo de tipo Boolean a la clase Prueba09', actual);
  assert.equal(pendiente?.estado, 'PREGUNTAR');
  if (pendiente?.estado !== 'PREGUNTAR') return;
  const completada = completarAtributoIncompleto('activo', actual, pendiente.contexto);
  assert.equal(completada.estado, 'LISTA');
  if (completada.estado !== 'LISTA') return;
  const ejecutada = ejecutarIntencionSobreModelo(actual, completada.intencion);
  assert.equal(ejecutada.exito, true);
  if (ejecutada.exito) assert.equal(ejecutada.contenido.clases[0].atributos[0].nombre, 'activo');
});

test('no infiere nada de órdenes compuestas o consultas no soportadas', () => {
  const actual = modelo();
  for (const texto of [
    'Agrega atributo nombre a la clase Prueba09 y elimina la clase.',
    'Agrega un atributo a la clase Prueba09 y borra Prueba09.',
    'Agrega atributo nombre a la clase Prueba09 de tipo String y elimina Prueba09.',
    '¿Qué atributo debería agregar a Prueba09?',
    'Agrega atributo nombre',
  ]) assert.equal(detectarAtributoIncompleto(texto, actual), null, texto);
});

test('no elige entre clases duplicadas o inexistentes y puede cancelar', () => {
  const actual = modelo();
  const pendiente = detectarAtributoIncompleto('agrega atributo nombre a la clase Prueba09', actual);
  assert.equal(pendiente?.estado, 'PREGUNTAR');
  if (pendiente?.estado !== 'PREGUNTAR') return;
  assert.equal(completarAtributoIncompleto('cancelar', actual, pendiente.contexto).estado, 'CANCELADA');
  assert.equal(detectarAtributoIncompleto('agrega atributo nombre a la clase Inexistente', actual)?.estado, 'ERROR');
  actual.clases.push({ ...structuredClone(actual.clases[0]), id: 'c2' });
  assert.equal(detectarAtributoIncompleto('agrega atributo nombre a la clase Prueba09', actual)?.estado, 'ERROR');
});

test('no convierte una respuesta compuesta o ambigua en modificación', () => {
  const actual = modelo();
  const pendiente = detectarAtributoIncompleto('agrega atributo nombre a la clase Prueba09', actual);
  assert.equal(pendiente?.estado, 'PREGUNTAR');
  if (pendiente?.estado !== 'PREGUNTAR') return;
  assert.equal(completarAtributoIncompleto('String y elimina la clase', actual, pendiente.contexto).estado, 'PREGUNTAR');
  assert.equal(completarAtributoIncompleto('String', actual, pendiente.contexto).estado, 'LISTA');
  assert.equal(actual.clases[0].atributos.length, 0);
});

test('la solicitud explícita de nombre y tipo se responde localmente', () => {
  const actual = modelo();
  const orden = 'Quiero agregar un atributo nuevo a la clase Prueba09, pero todavía no he decidido qué nombre tendrá ni qué tipo de dato utilizará. Antes de modificar el diagrama, pregúntame por la información que falta.';
  const resultado = detectarAtributoIncompleto(orden, actual);
  assert.equal(resultado?.estado, 'PREGUNTAR');
  if (resultado?.estado === 'PREGUNTAR') assert.match(resultado.pregunta, /nombre y tipo/);
});
