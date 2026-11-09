import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EJEMPLOS_WEBLLM,
  PROMPT_SISTEMA_WEBLLM,
  extraerObjetoJsonWebLlm,
} from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/formato-respuesta-webllm.ts';
import { validarIntencionAsistente } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/validar-intencion-asistente.ts';

test('el prompt exige JSON y contempla los tres estados sin permitir prosa', () => {
  for (const estado of ['LISTA', 'FALTAN_DATOS', 'NO_SOPORTADA']) {
    assert.ok(PROMPT_SISTEMA_WEBLLM.includes(estado), estado);
  }
  assert.match(PROMPT_SISTEMA_WEBLLM, /RESPONDE SOLO JSON/);
  assert.match(PROMPT_SISTEMA_WEBLLM, /NO lo pidas otra vez/);
  assert.match(PROMPT_SISTEMA_WEBLLM, /no inventes nombres/i);
});

test('los ejemplos incluidos en el prompt son intenciones válidas', () => {
  for (const ejemplo of EJEMPLOS_WEBLLM) {
    const json = JSON.stringify(ejemplo.salida);
    assert.ok(PROMPT_SISTEMA_WEBLLM.includes(`JSON: ${json}`));
    const validacion = validarIntencionAsistente(extraerObjetoJsonWebLlm(json));
    assert.equal(validacion.valida, true, `${ejemplo.solicitud}: ${validacion.errores.join('; ')}`);
  }
});

test('si faltan nombre y tipo, el ejemplo solicita ambos sin inventar datos', () => {
  const ejemplo = EJEMPLOS_WEBLLM.find((item) =>
    item.salida.estado === 'FALTAN_DATOS' && item.salida.datosFaltantes.length === 2);
  if (!ejemplo || ejemplo.salida.estado !== 'FALTAN_DATOS') {
    assert.fail('Falta el ejemplo de los dos datos obligatorios');
  }
  assert.deepEqual([...ejemplo.salida.datosFaltantes], ['nombre del atributo', 'tipo del atributo']);
  assert.match(ejemplo.salida.pregunta, /nombre y tipo/);
});

test('acepta JSON completo y bloque JSON, pero rechaza prosa y objetos incompletos', () => {
  const valido = '{"version":1,"estado":"FALTAN_DATOS","pregunta":"¿Qué nombre y tipo?","datosFaltantes":["nombre","tipo"]}';
  assert.deepEqual(extraerObjetoJsonWebLlm(valido), JSON.parse(valido));
  assert.deepEqual(extraerObjetoJsonWebLlm(`\`\`\`json\n${valido}\n\`\`\``), JSON.parse(valido));
  for (const erroneo of [
    `Te ayudaré con el diagrama. ${valido}`,
    `${valido}\nListo.`,
    '{"version":1,"estado":"LISTA",',
    '[]',
    'null',
    '"No te preocupes"',
  ]) {
    assert.throws(() => extraerObjetoJsonWebLlm(erroneo), /objeto JSON/);
  }
});

test('no confunde JSON bien formado con intención permitida', () => {
  const salida = extraerObjetoJsonWebLlm('{"version":1,"estado":"LISTA","acciones":[{"tipo":"ELIMINAR_CLASE","nombre":"Cliente"}]}');
  assert.equal(validarIntencionAsistente(salida).valida, false);
});
