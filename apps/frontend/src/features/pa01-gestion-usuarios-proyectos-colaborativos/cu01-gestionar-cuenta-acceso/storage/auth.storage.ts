import type { AuthSession } from '../types/auth.types';

const STORAGE_KEY = 'case-auth-session';
export const AUTH_SESSION_CHANGED_EVENT = 'case-auth-session-changed';

function notificarCambioSesion(): void {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function leerSesion(): AuthSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function guardarSesion(sesion: AuthSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
  notificarCambioSesion();
}

export function limpiarSesion(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  notificarCambioSesion();
}
