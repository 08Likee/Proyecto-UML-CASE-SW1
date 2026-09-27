export interface UsuarioSesion {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  fotoPerfil: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
}
