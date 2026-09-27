import { apiRequest } from '../../../../shared/api/http';

export type InvitacionEstado =
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'EXPIRADA'
  | 'CANCELADA';

export interface InvitacionRecibida {
  id: string;
  estado: InvitacionEstado;
  fechaCreacion: string;
  fechaExpiracion: string;
  idProyecto: string;
  proyectoNombre: string;
  idRol: string;
  rolNombre: string;
}

export interface InvitacionAceptada {
  idInvitacion: string;
  idProyecto: string;
  idMembresia: string;
  idRol: string;
}

export function listarInvitaciones(): Promise<InvitacionRecibida[]> {
  return apiRequest<InvitacionRecibida[]>('/invitaciones');
}

export function aceptarInvitacion(
  idInvitacion: string,
): Promise<InvitacionAceptada> {
  return apiRequest<InvitacionAceptada>(
    `/invitaciones/${idInvitacion}/aceptar`,
    { method: 'POST' },
  );
}

export function rechazarInvitacion(
  idInvitacion: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/invitaciones/${idInvitacion}/rechazar`,
    { method: 'POST' },
  );
}
