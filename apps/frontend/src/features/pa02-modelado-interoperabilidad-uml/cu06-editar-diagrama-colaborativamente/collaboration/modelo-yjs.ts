import * as Y from 'yjs';
import type { ModeloUmlContenido } from '../../cu05-modelar-diagrama-clases/types/modelo-uml.types';

const ROOT_MAP = 'modelo-uml';
const CONTENT_KEY = 'contenido';

export const ORIGEN_ZUSTAND = 'zustand-modelador';

function esObjetoPlano(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function crearValorY(value: unknown): unknown {
  if (Array.isArray(value)) {
    const array = new Y.Array<unknown>();
    array.insert(0, value.map((item) => crearValorY(item)));
    return array;
  }

  if (esObjetoPlano(value)) {
    const map = new Y.Map<unknown>();

    for (const [key, item] of Object.entries(value)) {
      map.set(key, crearValorY(item));
    }

    return map;
  }

  return value;
}

function leerValorY(value: unknown): unknown {
  if (value instanceof Y.Array) {
    return value.toArray().map((item) => leerValorY(item));
  }

  if (value instanceof Y.Map) {
    const result: Record<string, unknown> = {};

    for (const [key, item] of value.entries()) {
      result[key] = leerValorY(item);
    }

    return result;
  }

  return value;
}

function idObjeto(value: unknown): string | null {
  if (value instanceof Y.Map) {
    const id = value.get('id');
    return typeof id === 'string' ? id : null;
  }

  if (esObjetoPlano(value) && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

function sincronizarMapa(
  map: Y.Map<unknown>,
  value: Record<string, unknown>,
): void {
  for (const key of [...map.keys()]) {
    if (!(key in value)) {
      map.delete(key);
    }
  }

  for (const [key, next] of Object.entries(value)) {
    const current = map.get(key);

    if (current instanceof Y.Map && esObjetoPlano(next)) {
      sincronizarMapa(current, next);
      continue;
    }

    if (current instanceof Y.Array && Array.isArray(next)) {
      sincronizarArray(current, next);
      continue;
    }

    if (Object.is(current, next)) {
      continue;
    }

    map.set(key, crearValorY(next));
  }
}

function sincronizarArray(array: Y.Array<unknown>, next: unknown[]): void {
  const usaIdentificadores = next.every(
    (item) => esObjetoPlano(item) && typeof item.id === 'string',
  );

  if (!usaIdentificadores) {
    const actual = leerValorY(array);

    if (JSON.stringify(actual) === JSON.stringify(next)) {
      return;
    }

    if (array.length > 0) {
      array.delete(0, array.length);
    }

    if (next.length > 0) {
      array.insert(0, next.map((item) => crearValorY(item)));
    }

    return;
  }

  let index = 0;

  while (index < next.length) {
    const target = next[index] as Record<string, unknown>;
    const targetId = target.id as string;
    const current = array.get(index);

    if (idObjeto(current) === targetId) {
      if (current instanceof Y.Map) {
        sincronizarMapa(current, target);
      }
      index += 1;
      continue;
    }

    const actuales = array.toArray();
    const foundIndex = actuales.findIndex(
      (item, candidateIndex) =>
        candidateIndex > index && idObjeto(item) === targetId,
    );

    if (foundIndex >= 0) {
      array.delete(index, foundIndex - index);
      continue;
    }

    array.insert(index, [crearValorY(target)]);
    index += 1;
  }

  if (array.length > next.length) {
    array.delete(next.length, array.length - next.length);
  }
}

function esContenidoModelo(value: unknown): value is ModeloUmlContenido {
  if (!esObjetoPlano(value)) {
    return false;
  }

  return (
    value.versionEsquema === 1 &&
    Array.isArray(value.clases) &&
    Array.isArray(value.relaciones) &&
    esObjetoPlano(value.configuracion)
  );
}

export function obtenerContenidoDocumento(
  document: Y.Doc,
): ModeloUmlContenido | null {
  const value = document.getMap(ROOT_MAP).get(CONTENT_KEY);

  if (value === undefined) {
    return null;
  }

  const plain = leerValorY(value);
  return esContenidoModelo(plain) ? plain : null;
}

export function sincronizarContenidoDocumento(
  document: Y.Doc,
  contenido: ModeloUmlContenido,
): void {
  document.transact(() => {
    const root = document.getMap(ROOT_MAP);
    const current = root.get(CONTENT_KEY);

    if (current instanceof Y.Map) {
      sincronizarMapa(current, contenido as unknown as Record<string, unknown>);
      return;
    }

    root.set(CONTENT_KEY, crearValorY(contenido));
  }, ORIGEN_ZUSTAND);
}

export function documentoTieneContenido(document: Y.Doc): boolean {
  return obtenerContenidoDocumento(document) !== null;
}

export function registrarGuardadoRestEnDocumento(document: Y.Doc): void {
  document
    .getMap('modelo-uml-sesion')
    .set('ultimo-guardado-rest', new Date().toISOString());
}
