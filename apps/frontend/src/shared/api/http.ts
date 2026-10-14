import {
  guardarSesion,
  leerSesion,
  limpiarSesion,
} from '../../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/storage/auth.storage';
import type { AuthSession } from '../../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/types/auth.types';

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

function obtenerApiUrl(): string {
  if (!apiUrl) {
    throw new Error('VITE_API_URL no está configurada');
  }

  return apiUrl.replace(/\/$/, '');
}

async function obtenerMensajeError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(body.message)) {
      return body.message.join('. ');
    }

    if (typeof body.message === 'string') {
      return body.message;
    }

    if (typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // La respuesta puede no contener JSON.
  }

  return `La solicitud falló con estado ${response.status}`;
}

async function renovarSesion(sesion: AuthSession): Promise<AuthSession | null> {
  const response = await fetch(`${obtenerApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: sesion.refreshToken }),
  });

  if (!response.ok) {
    limpiarSesion();
    return null;
  }

  const body = (await response.json()) as { accessToken: string };
  const renovada: AuthSession = {
    ...sesion,
    accessToken: body.accessToken,
  };

  guardarSesion(renovada);
  return renovada;
}

export interface ApiRequestOptions extends RequestInit {
  autenticada?: boolean;
  reintentarTrasRefresh?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    autenticada = true,
    reintentarTrasRefresh = true,
    headers,
    ...requestInit
  } = options;

  const sesion = leerSesion();
  const requestHeaders = new Headers(headers);

  if (
    requestInit.body &&
    !(requestInit.body instanceof FormData) &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (autenticada) {
    if (!sesion) {
      throw new Error('La sesión no está disponible');
    }

    requestHeaders.set('Authorization', `Bearer ${sesion.accessToken}`);
  }

  const response = await fetch(`${obtenerApiUrl()}${path}`, {
    ...requestInit,
    headers: requestHeaders,
  });

  if (
    response.status === 401 &&
    autenticada &&
    reintentarTrasRefresh &&
    sesion
  ) {
    const renovada = await renovarSesion(sesion);

    if (renovada) {
      return apiRequest<T>(path, {
        ...options,
        reintentarTrasRefresh: false,
      });
    }
  }

  if (!response.ok) {
    throw new Error(await obtenerMensajeError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface ApiBlobResponse {
  blob: Blob;
  headers: Headers;
  status: number;
}

export async function apiBlobRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiBlobResponse> {
  const {
    autenticada = true,
    reintentarTrasRefresh = true,
    headers,
    ...requestInit
  } = options;

  const sesion = leerSesion();
  const requestHeaders = new Headers(headers);

  if (
    requestInit.body &&
    !(requestInit.body instanceof FormData) &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (autenticada) {
    if (!sesion) {
      throw new Error('La sesión no está disponible');
    }

    requestHeaders.set('Authorization', `Bearer ${sesion.accessToken}`);
  }

  const response = await fetch(`${obtenerApiUrl()}${path}`, {
    ...requestInit,
    headers: requestHeaders,
  });

  if (
    response.status === 401 &&
    autenticada &&
    reintentarTrasRefresh &&
    sesion
  ) {
    const renovada = await renovarSesion(sesion);

    if (renovada) {
      return apiBlobRequest(path, {
        ...options,
        reintentarTrasRefresh: false,
      });
    }
  }

  if (!response.ok) {
    throw new Error(await obtenerMensajeError(response));
  }

  return {
    blob: await response.blob(),
    headers: response.headers,
    status: response.status,
  };
}
