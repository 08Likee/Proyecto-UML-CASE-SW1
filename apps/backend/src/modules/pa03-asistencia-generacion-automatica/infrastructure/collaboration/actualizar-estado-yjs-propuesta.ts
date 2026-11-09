import { isDeepStrictEqual } from 'node:util';
import * as Y from 'yjs';
import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function aY(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    const y = new Y.Array<unknown>();
    if (valor.length) y.insert(0, valor.map(aY));
    return y;
  }
  if (esObjeto(valor)) {
    const y = new Y.Map<unknown>();
    for (const [clave, dato] of Object.entries(valor)) y.set(clave, aY(dato));
    return y;
  }
  return valor;
}
function aJson(valor: unknown): unknown {
  if (valor instanceof Y.Map) return Object.fromEntries([...valor].map(([k, v]) => [k, aJson(v)]));
  if (valor instanceof Y.Array) return valor.toArray().map(aJson);
  return valor;
}

/** Añade exclusivamente los elementos aprobados al CRDT persistido, preservando su historial. */
export function actualizarEstadoYjsPropuesta(
  anterior: ModeloUmlContenido,
  siguiente: ModeloUmlContenido,
  estadoYjsBase64: string | null,
): string {
  const doc = new Y.Doc();
  try {
    if (estadoYjsBase64) {
      Y.applyUpdate(doc, Buffer.from(estadoYjsBase64, 'base64'));
    } else {
      doc.getMap('modelo-uml').set('contenido', aY(anterior));
    }
    const contenido = doc.getMap('modelo-uml').get('contenido');
    if (!(contenido instanceof Y.Map) || !isDeepStrictEqual(aJson(contenido), anterior)) {
      throw new Error('El snapshot colaborativo difiere del modelo guardado; sincronizá antes de aplicar.');
    }
    const clasesY = contenido.get('clases');
    const relacionesY = contenido.get('relaciones');
    if (!(clasesY instanceof Y.Array) || !(relacionesY instanceof Y.Array)) {
      throw new Error('El snapshot colaborativo no tiene la estructura UML esperada.');
    }
    const previas = new Map(anterior.clases.map((c) => [c.id, c]));
    const nuevas = siguiente.clases.filter((c) => !previas.has(c.id));
    doc.transact(() => {
      if (nuevas.length) clasesY.push(nuevas.map(aY));
      for (const clase of siguiente.clases) {
        const previa = previas.get(clase.id);
        if (!previa || previa.atributos.length === clase.atributos.length) continue;
        const claseY = clasesY.toArray().find((c) => c instanceof Y.Map && c.get('id') === clase.id);
        if (!(claseY instanceof Y.Map)) throw new Error('Clase faltante en Yjs.');
        const atributosY = claseY.get('atributos');
        if (!(atributosY instanceof Y.Array)) throw new Error('Atributos inválidos en Yjs.');
        atributosY.push(clase.atributos.slice(previa.atributos.length).map(aY));
      }
      const nuevasRelaciones = siguiente.relaciones.slice(anterior.relaciones.length);
      if (nuevasRelaciones.length) relacionesY.push(nuevasRelaciones.map(aY));
    }, 'cu13-aplicacion-autorizada');
    if (!isDeepStrictEqual(aJson(contenido), siguiente)) {
      throw new Error('El estado colaborativo no coincide con los cambios aprobados.');
    }
    return Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64');
  } finally {
    doc.destroy();
  }
}
