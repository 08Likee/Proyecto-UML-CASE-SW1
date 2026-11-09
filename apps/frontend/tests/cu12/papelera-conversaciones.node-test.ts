import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = new URL('../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/', import.meta.url);
const api = readFileSync(new URL('api/conversaciones-ia.api.ts', base), 'utf8');
const panel = readFileSync(new URL('components/ConversacionesIaPanel.tsx', base), 'utf8');
const app = readFileSync(new URL('../../../../src/app/App.tsx', base), 'utf8');

test('CU12 papelera: botones de eliminación y restauración son exclusivos del Anfitrión', () => {
  assert.match(app, /acceso\?\.rol\.nombre === 'Anfitrión'/);
  assert.match(panel, /\{puedeGestionarPapelera && \(/);
  assert.match(panel, /Solo el Anfitrión/);
});

test('CU12 papelera: no borra definitivamente desde el navegador', () => {
  assert.match(api, /moverConversacionAPapelera/);
  assert.match(api, /restaurarConversacionIa/);
  assert.doesNotMatch(api, /method: 'DELETE'/);
});

test('CU12 papelera: el chat deja la lista activa y no muestra su editor', () => {
  assert.match(panel, /actuales\.filter\(\(c\) => c\.id !== eliminada\.id\)/);
  assert.match(panel, /mostrandoPapelera \? \(/);
  assert.match(panel, /Restaurar conversación/);
});
