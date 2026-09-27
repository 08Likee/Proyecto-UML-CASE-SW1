import { type ModeloUmlContenido } from '../models/modelo-uml';

const COLLABORATION_KEY = '__colaboracion';

interface CollaborationMetadata {
  formato: 1;
  estadoYjsBase64: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function separarEstadoColaborativo(contenido: ModeloUmlContenido): {
  contenido: ModeloUmlContenido;
  estadoYjsBase64: string | null;
} {
  const configuracion = { ...contenido.configuracion };
  const raw = configuracion[COLLABORATION_KEY];
  delete configuracion[COLLABORATION_KEY];

  let estadoYjsBase64: string | null = null;

  if (
    isObject(raw) &&
    raw.formato === 1 &&
    typeof raw.estadoYjsBase64 === 'string' &&
    raw.estadoYjsBase64.length > 0
  ) {
    estadoYjsBase64 = raw.estadoYjsBase64;
  }

  return {
    contenido: {
      ...contenido,
      configuracion,
    },
    estadoYjsBase64,
  };
}

export function agregarEstadoColaborativo(
  contenido: ModeloUmlContenido,
  estadoYjsBase64: string,
): ModeloUmlContenido {
  const metadata: CollaborationMetadata = {
    formato: 1,
    estadoYjsBase64,
  };

  return {
    ...contenido,
    configuracion: {
      ...contenido.configuracion,
      [COLLABORATION_KEY]: metadata,
    },
  };
}
