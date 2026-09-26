import type { AuthSession } from './auth.types';

const STORAGE_KEY = 'case-auth-session';

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
}

export function limpiarSesion(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
