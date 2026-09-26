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

export interface InvitacionRecibida {
  id: string;
  estado: InvitacionEstado;
  fechaCreacion: Date;
  fechaExpiracion: Date;

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
