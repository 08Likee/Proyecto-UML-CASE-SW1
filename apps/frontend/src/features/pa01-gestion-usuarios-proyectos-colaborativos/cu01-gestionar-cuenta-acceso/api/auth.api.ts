import { apiRequest } from '../../../../shared/api/http';
import { guardarSesion, limpiarSesion } from '../storage/auth.storage';
import type {
  AuthSession,
  MensajeResultado,
  PerfilUsuario,
  RegistroCuentaResultado,
} from '../types/auth.types';

export interface LoginEntrada {
  correo: string;
  contrasena: string;
}

export interface RegistroCuentaEntrada {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
}

export interface SolicitarRecuperacionEntrada {
  correo: string;
}

export interface ConfirmarRecuperacionEntrada {
  token: string;
  nuevaContrasena: string;
  confirmacionContrasena: string;
}

export interface ModificarPerfilEntrada {
  nombre: string;
  apellido: string;
  fotoPerfil?: string | null;
}

export interface CambiarContrasenaEntrada {
  contrasenaActual: string;
  nuevaContrasena: string;
  confirmacionContrasena: string;
}

export async function registrarCuenta(
  entrada: RegistroCuentaEntrada,
): Promise<RegistroCuentaResultado> {
  return apiRequest<RegistroCuentaResultado>('/auth/registro', {
    method: 'POST',
    autenticada: false,
    body: JSON.stringify(entrada),
  });
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

export async function verificarSesion(): Promise<{
  autenticado: boolean;
  usuarioId: string;
}> {
  return apiRequest('/auth/sesion');
}

export async function solicitarRecuperacion(
  entrada: SolicitarRecuperacionEntrada,
): Promise<MensajeResultado> {
  return apiRequest<MensajeResultado>('/auth/recuperacion/solicitar', {
    method: 'POST',
    autenticada: false,
    body: JSON.stringify(entrada),
  });
}

export async function confirmarRecuperacion(
  entrada: ConfirmarRecuperacionEntrada,
): Promise<MensajeResultado> {
  return apiRequest<MensajeResultado>('/auth/recuperacion/confirmar', {
    method: 'POST',
    autenticada: false,
    body: JSON.stringify(entrada),
  });
}

export async function obtenerPerfil(): Promise<PerfilUsuario> {
  return apiRequest<PerfilUsuario>('/auth/perfil');
}

export async function modificarPerfil(
  entrada: ModificarPerfilEntrada,
): Promise<PerfilUsuario> {
  return apiRequest<PerfilUsuario>('/auth/perfil', {
    method: 'PUT',
    body: JSON.stringify(entrada),
  });
}

export async function cambiarContrasena(
  entrada: CambiarContrasenaEntrada,
): Promise<MensajeResultado> {
  return apiRequest<MensajeResultado>('/auth/contrasena', {
    method: 'PUT',
    body: JSON.stringify(entrada),
  });
}
