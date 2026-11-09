import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  coincideContenidoPersistido,
  prepararMensajeRegistroOrdenUml,
  verificarPersistenciaOrdenUml,
} from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/trazabilidad-orden-uml.ts';

const contenido = {
  versionEsquema: 1 as const,
  clases: [{ id: '1', nombre: 'Venta', atributos: [], operaciones: [], posicion: { x: 3, y: 5 }, persistencia: { persistente: false, idAtributoIdentificador: null } }],
  relaciones: [],
  configuracion: { zoom: 1 },
};

const registroBase = {
  idModelo: 'modelo-1', nombreModelo: 'Ventas', ordenOriginal: 'Crear clase Venta',
  ordenProcesada: 'Crear clase Venta', detalle: 'Se creó Venta.', versionAnterior: 20,
};

test('CU09 bloque 11.3: registra un éxito solo con versión persistida superior', () => {
  assert.throws(() => prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'APLICADA' }), /versión persistida/);
  assert.throws(() => prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'APLICADA', versionConfirmada: 20 }), /versión persistida/);
  const texto = prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'APLICADA', versionConfirmada: 21 });
  assert.match(texto, /APLICADA, persistencia comprobada en v21/);
  assert.match(texto, /Modelo: Ventas \(modelo-1\)/);
  assert.match(texto, /Constancia publicada por el participante/);
});

test('CU09 bloque 11.3: las órdenes incompletas y rechazadas nunca se marcan como aplicadas', () => {
  const incompleta = prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'FALTAN_DATOS', detalle: 'Falta un tipo.' });
  const rechazo = prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'NO_EJECUTADA' });
  assert.match(incompleta, /PENDIENTE DE DATOS, no ejecutada/);
  assert.match(rechazo, /NO EJECUTADA/);
  assert.doesNotMatch(rechazo, /persistencia comprobada/);
});

test('CU09 bloque 11.3: registra original y versión aunque se complete una orden más tarde', () => {
  const texto = prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'APLICADA', ordenOriginal: 'Agrega atributo', ordenProcesada: 'nombre: edad, tipo: Integer', versionConfirmada: 21 });
  assert.match(texto, /Orden recibida de la conversación: Agrega atributo/);
  assert.match(texto, /Texto procesado en el asistente: nombre: edad, tipo: Integer/);
  assert.match(texto, /Versión observada antes del intento: v20/);
});

test('CU09 bloque 11.3: nunca supera 8000 caracteres ni guarda instrucciones en blanco', () => {
  assert.throws(() => prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'NO_EJECUTADA', ordenOriginal: '  ' }), /identificar/);
  const texto = prepararMensajeRegistroOrdenUml({ ...registroBase, estado: 'NO_EJECUTADA', ordenOriginal: 'a'.repeat(8000), ordenProcesada: 'b'.repeat(8000), detalle: 'c'.repeat(4000) });
  assert.ok(texto.length <= 8000);
  assert.match(texto, /\[recortado\]/);
});

test('CU09 bloque 11.3: verifica contenido estructural ignorando orden JSONB y metadatos Yjs', () => {
  const reorganizado = {
    configuracion: { __colaboracion: { estadoYjsBase64: 'abc' }, zoom: 1 },
    relaciones: [],
    clases: [{ persistencia: { idAtributoIdentificador: null, persistente: false }, posicion: { y: 5, x: 3 }, operaciones: [], atributos: [], nombre: 'Venta', id: '1' }],
    versionEsquema: 1 as const,
  };
  assert.equal(coincideContenidoPersistido(contenido, reorganizado), true);
  assert.equal(coincideContenidoPersistido(contenido, { ...contenido, relaciones: [{ id: 'r', tipo: 'ASOCIACION', idClaseOrigen: '1', idClaseDestino: '2', nombre: null, multiplicidadOrigen: '1', multiplicidadDestino: '*' }] }), false);
});

test('CU09 bloque 11.3: no publica éxito si la versión no avanzó o difiere el contenido', async () => {
  let preparaciones = 0;
  let consultas = 0;
  const version = await verificarPersistenciaOrdenUml(contenido, 20,
    async () => { preparaciones += 1; },
    async () => { consultas += 1; return { version: 20, contenido }; },
    async () => {},
  );
  assert.equal(version, null);
  assert.equal(preparaciones, 1);
  assert.equal(consultas, 3);
  assert.equal(await verificarPersistenciaOrdenUml(contenido, 20, async () => {}, async () => ({ version: 21, contenido: { ...contenido, relaciones: [{ id: '2', tipo: 'ASOCIACION', idClaseOrigen: '1', idClaseDestino: '3', nombre: null, multiplicidadOrigen: '1', multiplicidadDestino: '*' }] } }), async () => {}), null);
});

test('CU09 bloque 11.3: confirma persistencia eventual sin reejecutar la orden', async () => {
  let consultas = 0;
  const version = await verificarPersistenciaOrdenUml(contenido, 22, async () => {}, async () => {
    consultas += 1;
    return { version: consultas < 2 ? 22 : 23, contenido };
  }, async () => {});
  assert.equal(version, 23);
  assert.equal(consultas, 2);
});

test('CU09 bloque 11.3: el origen incluye la conversación seleccionada, no solo el texto', () => {
  const panel = readFileSync(new URL('../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/components/HistorialConversacion.tsx', import.meta.url), 'utf8');
  const modelador = readFileSync(new URL('../../src/features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/components/ModeladorUml.tsx', import.meta.url), 'utf8');
  assert.match(panel, /onRevisarOrdenUml\(texto, conversacion\.id\)/);
  assert.match(modelador, /setOrigenOrdenUml\(\{ idConversacion, idModelo: modelo\.id/);
  assert.match(modelador, /enviarMensajeIa\(idProyecto, origenOrdenUml\.idConversacion, contenidoRegistro\)/);
});

test('CU09 bloque 11.3: transferencia sola no genera mensajes y no se confunde con propuestas CU13', () => {
  const modelador = readFileSync(new URL('../../src/features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/components/ModeladorUml.tsx', import.meta.url), 'utf8');
  const asistente = readFileSync(new URL('../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/components/AsistenteIaPanel.tsx', import.meta.url), 'utf8');
  assert.match(modelador, /setOrigenOrdenUml\(\{ idConversacion, idModelo: modelo\.id/);
  assert.match(asistente, /await registrarResultado\('APLICADA'/);
  assert.match(asistente, /await registrarResultado\('NO_EJECUTADA'/);
  assert.match(asistente, /setTrazabilidadActiva\(false\)/);
});
