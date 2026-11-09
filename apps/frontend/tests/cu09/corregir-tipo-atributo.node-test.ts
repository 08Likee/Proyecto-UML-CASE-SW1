import assert from 'node:assert/strict';
import { test } from 'node:test';
import { corregirTipoDeAtributoExplicito } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/corregir-tipo-atributo-explicito.ts';
import { validarIntencionAsistente } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/validar-intencion-asistente.ts';
import { ejecutarIntencionSobreModelo } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/ejecutar-intencion-modelo.ts';

const clases = [{ nombre: 'Cliente' }, { nombre: 'Persona' }];
const pedirTipo = {
  version: 1, estado: 'FALTAN_DATOS',
  pregunta: '¿Qué tipo tendrá el atributo id?',
  datosFaltantes: ['tipo del atributo id'],
};
const instruccion = 'Agrega a la clase Cliente un atributo llamado id de tipo Integer.';

test('recupera únicamente un tipo explícito con clase inequívoca', () => {
  assert.deepEqual(corregirTipoDeAtributoExplicito(pedirTipo, instruccion, clases, false), {
    version: 1, estado: 'LISTA',
    acciones: [{ tipo: 'AGREGAR_ATRIBUTO', clase: { nombre: 'Cliente' }, atributo: { nombre: 'id', tipo: 'Integer' } }],
  });
});

test('no modifica solicitudes compuestas ni contextos pendientes', () => {
  assert.equal(corregirTipoDeAtributoExplicito(pedirTipo, instruccion + ' Y renómbrala.', clases, false), pedirTipo);
  assert.equal(corregirTipoDeAtributoExplicito(pedirTipo, instruccion, clases, true), pedirTipo);
});

test('no inventa tipos, clases o acciones', () => {
  assert.equal(corregirTipoDeAtributoExplicito(pedirTipo, 'Agrega a la clase Cliente un atributo llamado id.', clases, false), pedirTipo);
  assert.equal(corregirTipoDeAtributoExplicito(pedirTipo, 'Agrega a la clase Desconocida un atributo llamado id de tipo Integer.', clases, false), pedirTipo);
  assert.equal(corregirTipoDeAtributoExplicito(pedirTipo, instruccion, [clases[0], clases[0]], false), pedirTipo);
  const noSoportada = { estado: 'NO_SOPORTADA' };
  assert.equal(corregirTipoDeAtributoExplicito(noSoportada, instruccion, clases, false), noSoportada);
  const versionIncorrecta = { ...pedirTipo, version: 2 };
  assert.equal(corregirTipoDeAtributoExplicito(versionIncorrecta, instruccion, clases, false), versionIncorrecta);
});

test('no corrige preguntas ajenas al tipo de atributo', () => {
  const respuesta = { estado: 'FALTAN_DATOS', pregunta: '¿Qué clase será el destino?', datosFaltantes: ['destino'] };
  assert.equal(corregirTipoDeAtributoExplicito(respuesta, instruccion, clases, false), respuesta);
});

test('la corrección pasa el validador y agrega id sin mutar el modelo de entrada', () => {
  const modelo = {
    clases: [{ id: 'c1', nombre: 'Cliente', atributos: [], operaciones: [], posicion: { x: 0, y: 0 }, persistencia: { persistente: false, idAtributoIdentificador: null } }],
    relaciones: [],
  };
  const salida = corregirTipoDeAtributoExplicito(pedirTipo, instruccion, modelo.clases, false);
  const validacion = validarIntencionAsistente(salida);
  assert.equal(validacion.valida, true);
  assert.ok(validacion.intencion);
  const ejecucion = ejecutarIntencionSobreModelo(modelo, validacion.intencion);
  assert.equal(ejecucion.exito, true);
  if (ejecucion.exito) {
    assert.equal(ejecucion.contenido.clases[0].atributos[0].nombre, 'id');
    assert.equal(ejecucion.contenido.clases[0].atributos[0].tipo, 'Integer');
  }
  assert.deepEqual(modelo.clases[0].atributos, []);
});
