import {
  type ActualizarPerfilDatos,
  type CrearUsuarioDatos,
  type Usuario,
} from '../models/usuario';

export abstract class UsuarioRepository {
  abstract buscarPorCorreo(correo: string): Promise<Usuario | null>;

  abstract buscarPorId(idUsuario: string): Promise<Usuario | null>;

  abstract crear(datos: CrearUsuarioDatos): Promise<Usuario>;

  abstract actualizarPerfil(
    idUsuario: string,
    datos: ActualizarPerfilDatos,
  ): Promise<Usuario | null>;

  abstract actualizarUltimaConexion(
    idUsuario: string,
    fecha: Date,
  ): Promise<void>;
}
