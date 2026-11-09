import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(
  new URL('../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/styles/cu12.css', import.meta.url),
  'utf8',
);

function reglas(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Falta la regla CSS ${selector}`);
  return match[1];
}

test('CU12 RF-46 UX: el checkbox no hereda el ancho completo de input', () => {
  const checkbox = reglas('.cu12-contexto-opcion input[type="checkbox"]');
  assert.match(checkbox, /(?:^|;)\s*width:\s*18px\s*;/);
  assert.match(checkbox, /(?:^|;)\s*height:\s*18px\s*;/);
  assert.match(checkbox, /(?:^|;)\s*padding:\s*0\s*;/);
});

test('CU12 RF-46 UX: los títulos tienen columna flexible y no generan scroll horizontal', () => {
  assert.match(reglas('.cu12-contexto-opcion'), /grid-template-columns:\s*18px\s+minmax\(0,\s*1fr\)/);
  assert.match(reglas('.cu12-contexto-opcion > span'), /overflow-wrap:\s*anywhere/);
  assert.match(reglas('.cu12-contexto-fuentes'), /overflow-x:\s*hidden/);
  assert.match(reglas('.cu12-contexto-fuentes'), /overflow-y:\s*auto/);
});
