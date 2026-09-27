import * as Y from 'yjs';

const ROOT_MAP = 'modelo-uml';
const CONTENT_KEY = 'contenido';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toYValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const array = new Y.Array<unknown>();
    array.insert(0, value.map((item) => toYValue(item)));
    return array;
  }

  if (isPlainObject(value)) {
    const map = new Y.Map<unknown>();

    for (const [key, item] of Object.entries(value)) {
      map.set(key, toYValue(item));
    }

    return map;
  }

  return value;
}

function fromYValue(value: unknown): unknown {
  if (value instanceof Y.Array) {
    return value.toArray().map((item) => fromYValue(item));
  }

  if (value instanceof Y.Map) {
    const result: Record<string, unknown> = {};

    for (const [key, item] of value.entries()) {
      result[key] = fromYValue(item);
    }

    return result;
  }

  return value;
}

export function crearDocumentoDesdeContenido(contenido: unknown): Y.Doc {
  const document = new Y.Doc();

  document.transact(() => {
    document.getMap(ROOT_MAP).set(CONTENT_KEY, toYValue(contenido));
  }, 'bootstrap-postgresql');

  return document;
}

export function extraerContenidoDocumento(document: Y.Doc): unknown {
  const value = document.getMap(ROOT_MAP).get(CONTENT_KEY);

  if (value === undefined) {
    throw new Error('El documento colaborativo no contiene un modelo UML');
  }

  return fromYValue(value);
}

export function encodeDocumentStateBase64(document: Y.Doc): string {
  return Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64');
}

export function decodeDocumentStateBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}
