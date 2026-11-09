import { ApiHttpError } from '../../../../shared/api/api-http-error.ts';

/** Sólo respuestas HTTP reales de acceso permiten concluir revocación. */
export function esAccesoRevocadoHttp(error: unknown): boolean {
  return error instanceof ApiHttpError && [401, 403, 404, 410].includes(error.status);
}

/** Hocuspocus puede devolver el mismo rechazo como texto durante la conexión. */
export function esRechazoAutorizacionColaborativa(reason: string): boolean {
  const normalizado = reason.toLowerCase();
  return /\bhttp\s+(401|403|404|410)\b/.test(normalizado) ||
    normalizado.includes('no posee autorización') ||
    normalizado.includes('no posee autorizacion') ||
    normalizado.includes('modelo uml no existe') ||
    normalizado.includes('proyecto no disponible') ||
    normalizado.includes('no autorizado para consultar');
}

/** La desconexión genuina permite conservar la copia local; nunca una revocación. */
export function admiteModoOffline(conexion: string, listo: boolean, accesoRevocado: boolean, error: string | null): boolean {
  return conexion === 'desconectado' && listo && !accesoRevocado && !error;
}
