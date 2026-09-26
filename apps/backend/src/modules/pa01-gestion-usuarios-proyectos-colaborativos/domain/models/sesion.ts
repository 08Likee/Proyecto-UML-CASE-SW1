export interface Sesion {
  id: string;
  refreshTokenHash: string;
  fechaCreacion: Date;
  fechaExpiracion: Date;
  fechaRevocacion: Date | null;
  dispositivo: string | null;
  idUsuario: string;
}

export interface CrearSesionDatos {
  id: string;
  refreshTokenHash: string;
  fechaExpiracion: Date;
  dispositivo?: string | null;
  idUsuario: string;
}
