import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync('apps/frontend/src/app/App.tsx', 'utf8');
const api = readFileSync('apps/frontend/src/features/pa01-gestion-usuarios-proyectos-colaborativos/cu02-gestionar-proyecto-colaborativo/api/proyectos.api.ts', 'utf8');
const modeloApi = readFileSync('apps/frontend/src/features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/api/modelos-uml.api.ts', 'utf8');
test('papelera de proyectos restringida al Anfitrión y permiso efectivo', () => {
  assert.match(app, /proyectosPapelera\.length > 0 \|\| puedeGestionarPapelera/);
  assert.match(app, /puedeEliminar=\{Boolean\(puedeGestionarPapelera\)\}/);
});
test('papelera de modelos requiere Anfitrión y permiso MODELO EDITAR', () => {
  assert.match(app, /acceso\?\.rol\.nombre === 'Anfitrión' && puedeEditar/);
});
test('restauración no recrea modelos ni proyectos desde el navegador', () => {
  assert.match(modeloApi, /\/restaurar.*method: 'POST'/s);
  assert.match(api, /\/restaurar.*method: 'POST'/s);
});
test('interfaz avisa antes de retirar proyecto con datos asociados', () => {
  assert.match(app, /window\.confirm\(`¿Enviar el proyecto/);
  assert.match(app, /modelos, conversaciones y accesos/);
});
