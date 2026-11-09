import assert from 'node:assert/strict';
import test from 'node:test';
import {
  esBloqueMermaid, urlExternaSegura,
} from '../../src/features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/helpers/formato-respuestas.helpers.ts';

test('CU09: detecta bloques Mermaid sin afectar otros lenguajes', () => {
  assert.equal(esBloqueMermaid('language-mermaid'), true);
  assert.equal(esBloqueMermaid('foo language-MERMAID bar'), true);
  assert.equal(esBloqueMermaid('language-java'), false);
  assert.equal(esBloqueMermaid(undefined), false);
  assert.equal(esBloqueMermaid('language-mermaid-malicioso'), false);
});

test('CU09: enlaces seguros mantienen HTTPS, HTTP y mailto', () => {
  assert.equal(urlExternaSegura('https://ejemplo.org/documentacion'), 'https://ejemplo.org/documentacion');
  assert.equal(urlExternaSegura('http://ejemplo.org'), 'http://ejemplo.org/');
  assert.equal(urlExternaSegura('mailto:docente@ejemplo.org'), 'mailto:docente@ejemplo.org');
});

test('CU09: esquemas peligrosos y enlaces relativos no se activan', () => {
  for (const valor of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', '/admin', '#seccion', undefined]) {
    assert.equal(urlExternaSegura(valor), null);
  }
});
