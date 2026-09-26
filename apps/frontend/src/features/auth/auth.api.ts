import { apiRequest } from '../../shared/api/http';
import { guardarSesion, limpiarSesion } from './auth.storage';
import type { AuthSession } from './auth.types';

export interface LoginEntrada {
  correo: string;
  contrasena: string;
}

export async function iniciarSesion(
  entrada: LoginEntrada,
): Promise<AuthSession> {
  const sesion = await apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    autenticada: false,
    body: JSON.stringify(entrada),
  });

  guardarSesion(sesion);
  return sesion;
}

export async function cerrarSesion(sesion: AuthSession): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout', {
      method: 'POST',
      autenticada: false,
      body: JSON.stringify({ refreshToken: sesion.refreshToken }),
    });
  } finally {
    limpiarSesion();
  }
}
