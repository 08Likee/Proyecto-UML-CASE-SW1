import assert from 'node:assert/strict';
import test from 'node:test';
import type { ModeloUmlContenido } from '../../src/features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types.ts';
import { ejecutarIntencionSobreModelo } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/ejecutar-intencion-modelo.ts';
import {
  validarIntencionAsistente,
  validarJsonIntencionAsistente,
} from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/validar-intencion-asistente.ts';

function contenidoVacio(): ModeloUmlContenido {
  return {
    versionEsquema: 1,
    clases: [],
    relaciones: [],
    configuracion: {},
  };
}

function contenidoBase(): ModeloUmlContenido {
  return {
    versionEsquema: 1,
    configuracion: {},
    clases: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        nombre: 'Persona',
        posicion: { x: 80, y: 80 },
        atributos: [
          {
            id: '21111111-1111-4111-8111-111111111111',
            nombre: 'id',
            tipo: 'Integer',
            visibilidad: 'PRIVADA',
          },
        ],
        operaciones: [],
        persistencia: {
          persistente: true,
          idAtributoIdentificador: '21111111-1111-4111-8111-111111111111',
        },
      },
      {
        id: '31111111-1111-4111-8111-111111111111',
        nombre: 'Direccion',
        posicion: { x: 420, y: 80 },
        atributos: [],
        operaciones: [],
        persistencia: {
          persistente: false,
          idAtributoIdentificador: null,
        },
      },
    ],
    relaciones: [],
  };
}

test('valida una intención estructurada soportada', () => {
  const resultado = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [
      {
        tipo: 'CREAR_CLASE',
        nombre: 'Cliente',
        atributos: [{ nombre: 'id', tipo: 'Integer' }],
      },
    ],
  });

  assert.equal(resultado.valida, true);
  assert.equal(resultado.errores.length, 0);
  assert.equal(resultado.intencion?.estado, 'LISTA');
});

test('rechaza JSON inválido y acciones fuera del contrato', () => {
  assert.equal(validarJsonIntencionAsistente('```json {mal} ```').valida, false);
  const resultado = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [{ tipo: 'BORRAR_BASE_DE_DATOS' }],
  });
  assert.equal(resultado.valida, false);
  assert.match(resultado.errores.join(' '), /acción soportada/i);
});

test('crea clase completa con atributos, operación e identificador', () => {
  const validada = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [
      {
        tipo: 'CREAR_CLASE',
        nombre: 'Cliente',
        persistente: true,
        atributoIdentificador: 'id',
        atributos: [
          { nombre: 'id', tipo: 'Integer' },
          { nombre: 'nombre', tipo: 'String' },
        ],
        operaciones: [
          {
            nombre: 'cambiarNombre',
            tipoRetorno: 'String',
            parametros: [{ nombre: 'nuevoNombre', tipo: 'String' }],
          },
        ],
      },
    ],
  });

  assert.ok(validada.intencion);
  const resultado = ejecutarIntencionSobreModelo(contenidoVacio(), validada.intencion);
  assert.equal(resultado.exito, true);
  if (!resultado.exito) return;

  const cliente = resultado.contenido.clases[0];
  assert.equal(cliente.nombre, 'Cliente');
  assert.equal(cliente.atributos.length, 2);
  assert.equal(cliente.operaciones[0].parametros[0].nombre, 'nuevoNombre');
  assert.equal(cliente.operaciones[0].tipoRetorno, 'String');
  assert.equal(
    cliente.persistencia.idAtributoIdentificador,
    cliente.atributos.find((atributo) => atributo.nombre === 'id')?.id,
  );
});

test('el lote es atómico si una acción falla', () => {
  const original = contenidoVacio();
  const copia = structuredClone(original);
  const validada = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [
      { tipo: 'CREAR_CLASE', nombre: 'Cliente' },
      {
        tipo: 'AGREGAR_ATRIBUTO',
        clase: { nombre: 'Inexistente' },
        atributo: { nombre: 'id', tipo: 'Integer' },
      },
    ],
  });

  assert.ok(validada.intencion);
  const resultado = ejecutarIntencionSobreModelo(original, validada.intencion);
  assert.equal(resultado.exito, false);
  assert.deepEqual(original, copia);
});

test('respeta las convenciones de generalización y composición', () => {
  const validada = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [
      {
        tipo: 'CREAR_RELACION',
        origen: { nombre: 'Direccion' },
        destino: { nombre: 'Persona' },
        tipoRelacion: 'GENERALIZACION',
      },
      {
        tipo: 'CREAR_RELACION',
        origen: { nombre: 'Persona' },
        destino: { nombre: 'Direccion' },
        tipoRelacion: 'COMPOSICION',
        multiplicidadOrigen: '1',
        multiplicidadDestino: '1',
      },
    ],
  });

  assert.ok(validada.intencion);
  const resultado = ejecutarIntencionSobreModelo(contenidoBase(), validada.intencion);
  assert.equal(resultado.exito, true);
  if (!resultado.exito) return;

  assert.equal(resultado.contenido.relaciones[0].multiplicidadOrigen, null);
  assert.equal(resultado.contenido.relaciones[0].multiplicidadDestino, null);
  assert.equal(resultado.contenido.relaciones[1].tipo, 'COMPOSICION');
  assert.equal(
    resultado.contenido.relaciones[1].idClaseOrigen,
    '11111111-1111-4111-8111-111111111111',
  );
});

test('no inventa multiplicidades faltantes', () => {
  const validada = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [
      {
        tipo: 'CREAR_RELACION',
        origen: { nombre: 'Persona' },
        destino: { nombre: 'Direccion' },
        tipoRelacion: 'ASOCIACION',
      },
    ],
  });

  assert.ok(validada.intencion);
  const resultado = ejecutarIntencionSobreModelo(contenidoBase(), validada.intencion);
  assert.equal(resultado.exito, false);
  if (resultado.exito) return;
  assert.equal(resultado.codigo, 'MULTIPLICIDAD_FALTANTE');
});

test('detecta referencias ambiguas por nombre', () => {
  const contenido = contenidoBase();
  contenido.clases.push({
    ...structuredClone(contenido.clases[0]),
    id: '41111111-1111-4111-8111-111111111111',
    atributos: [],
    persistencia: { persistente: false, idAtributoIdentificador: null },
  });
  const validada = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [
      {
        tipo: 'AGREGAR_ATRIBUTO',
        clase: { nombre: 'Persona' },
        atributo: { nombre: 'correo', tipo: 'String' },
      },
    ],
  });

  assert.ok(validada.intencion);
  const resultado = ejecutarIntencionSobreModelo(contenido, validada.intencion);
  assert.equal(resultado.exito, false);
  if (resultado.exito) return;
  assert.equal(resultado.codigo, 'CLASE_AMBIGUA');
});

test('FALTAN_DATOS se devuelve sin modificar el modelo', () => {
  const resultado = ejecutarIntencionSobreModelo(contenidoBase(), {
    version: 1,
    estado: 'FALTAN_DATOS',
    pregunta: '¿Qué multiplicidades deseas?',
    datosFaltantes: ['multiplicidadOrigen', 'multiplicidadDestino'],
  });

  assert.equal(resultado.exito, false);
  if (resultado.exito) return;
  assert.equal(resultado.codigo, 'FALTAN_DATOS');
  assert.equal(resultado.indiceAccion, null);
});
