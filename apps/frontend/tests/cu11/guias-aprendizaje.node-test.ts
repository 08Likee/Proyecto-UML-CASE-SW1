import assert from 'node:assert/strict';
import test from 'node:test';
import {
  condicionDePaso,
  guiaPorId,
  GUIAS_CU11,
  type ContextoAprendizaje,
  type RequisitoGuia,
} from '../../src/features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/guias-aprendizaje.ts';

const contextoValido: ContextoAprendizaje = {
  autenticado: true,
  proyectoSeleccionado: true,
  modeloAbierto: true,
  puedeEditarModelo: true,
  puedeConsultarConversaciones: true,
  puedeGenerarBackend: true,
  puedeImportarXmi: true,
  puedeExportarXmi: true,
};
function paso(requisito: RequisitoGuia) {
  return { titulo: 'T', indicacion: 'I', orientacion: 'O', requisito };
}

test('CU11: el catálogo contiene recorridos de funciones reales y pasos completos', () => {
  assert.equal(GUIAS_CU11.length, 6);
  assert.equal(new Set(GUIAS_CU11.map((guia) => guia.id)).size, GUIAS_CU11.length);
  for (const guia of GUIAS_CU11) {
    assert.ok(guia.titulo && guia.objetivo);
    assert.ok(guia.pasos.length >= 3);
    for (const p of guia.pasos) {
      assert.ok(p.titulo && p.indicacion && p.orientacion);
      assert.equal(condicionDePaso(p, contextoValido), null);
    }
  }
});

test('CU11: las guías pueden consultarse sin depender del proveedor de IA', () => {
  assert.equal(guiaPorId('crear-clase')?.titulo, 'Crear una clase UML');
  assert.equal(guiaPorId('desconocida'), undefined);
});

test('CU11: deniega una guía sin sesión', () => {
  assert.match(condicionDePaso(paso('AUTENTICADO'), { ...contextoValido, autenticado: false })!, /Iniciá sesión/);
});

test('CU11: los pasos de proyecto exigen proyecto seleccionado', () => {
  assert.match(condicionDePaso(paso('PROYECTO'), { ...contextoValido, proyectoSeleccionado: false })!, /proyecto/);
  assert.equal(condicionDePaso(paso('PROYECTO'), contextoValido), null);
});

test('CU11: el modelador debe estar abierto antes de enseñar operaciones de modelo', () => {
  assert.match(condicionDePaso(paso('MODELO'), { ...contextoValido, modeloAbierto: false })!, /Abrí un modelo/);
  assert.match(condicionDePaso(paso('EDITAR_MODELO'), { ...contextoValido, modeloAbierto: false })!, /Abrí un modelo/);
});

test('CU11: el Espectador no obtiene MODELO / EDITAR por seguir una guía', () => {
  const espectador = { ...contextoValido, puedeEditarModelo: false };
  assert.match(condicionDePaso(paso('EDITAR_MODELO'), espectador)!, /MODELO \/ EDITAR/);
  assert.equal(condicionDePaso(paso('MODELO'), espectador), null);
  assert.equal(condicionDePaso(paso('CONSULTAR_CONVERSACIONES'), espectador), null);
});

test('CU11: el acceso a conversaciones requiere permiso del proyecto', () => {
  const restringido = { ...contextoValido, puedeConsultarConversaciones: false };
  assert.match(condicionDePaso(paso('CONSULTAR_CONVERSACIONES'), restringido)!, /PROYECTO \/ CONSULTAR/);
});

test('CU11: generar backend requiere autorización independiente', () => {
  assert.match(condicionDePaso(paso('GENERAR_BACKEND'), { ...contextoValido, puedeGenerarBackend: false })!, /GENERACION \/ GENERAR/);
});

test('CU11: importación y exportación poseen permisos distintos', () => {
  const restringido = { ...contextoValido, puedeImportarXmi: false };
  assert.match(condicionDePaso(paso('IMPORTAR_XMI'), restringido)!, /IMPORTAR/);
  assert.equal(condicionDePaso(paso('EXPORTAR_XMI'), restringido), null);
});

test('CU11: aprender no precisa permisos de edición cuando solo se estudia', () => {
  const contexto = { ...contextoValido, modeloAbierto: false, puedeEditarModelo: false, puedeGenerarBackend: false };
  assert.equal(condicionDePaso(paso('AUTENTICADO'), contexto), null);
  assert.equal(condicionDePaso(paso('PROYECTO'), contexto), null);
});

test('CU11: las propuestas exigen simultáneamente modelo abierto y conversación autorizada', () => {
  assert.match(condicionDePaso(paso('PROPONER_UML'), { ...contextoValido, modeloAbierto: false })!, /Abrí un modelo/);
  assert.match(condicionDePaso(paso('PROPONER_UML'), { ...contextoValido, puedeConsultarConversaciones: false })!, /PROYECTO \/ CONSULTAR/);
  assert.equal(condicionDePaso(paso('PROPONER_UML'), contextoValido), null);
});
