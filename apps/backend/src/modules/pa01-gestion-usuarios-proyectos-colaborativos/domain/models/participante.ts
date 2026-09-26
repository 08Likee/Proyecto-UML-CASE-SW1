export interface ParticipanteProyecto {
  idMembresia: string;
  idUsuario: string;
  nombre: string;
  apellido: string;
  correo: string;
  estadoMembresia: string;
  idRol: string;
  rolNombre: string;
  rolPredeterminado: boolean;
}

export type FuentePermisoEfectivo = 'ROL' | 'CONCEDER' | 'DENEGAR' | 'NINGUNO';

export interface PermisoEfectivoParticipante {
  idPermiso: string;
  nombre: string;
  recurso: string;
  accion: string;
  permitido: boolean;
  fuente: FuentePermisoEfectivo;
}

export interface DetalleMembresia {
  idMembresia: string;
  idUsuario: string;
  idRol: string;
  rolNombre: string;
  rolPredeterminado: boolean;
}
