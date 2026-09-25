export type UsuarioEstado = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  contrasenaHash: string;
  fotoPerfil: string | null;
  estado: UsuarioEstado;
  fechaRegistro: Date;
  ultimaConexion: Date | null;
}

export interface CrearUsuarioDatos {
  nombre: string;
  apellido: string;
  correo: string;
  contrasenaHash: string;
  fotoPerfil?: string | null;
}
