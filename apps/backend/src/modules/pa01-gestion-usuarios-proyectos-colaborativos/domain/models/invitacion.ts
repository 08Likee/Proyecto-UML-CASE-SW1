export type InvitacionEstado =
  'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'EXPIRADA' | 'CANCELADA';

export interface Invitacion {
  id: string;
  estado: InvitacionEstado;
  fechaCreacion: Date;
  fechaExpiracion: Date;
  idProyecto: string;
  idUsuario: string;
  idRol: string;
}
