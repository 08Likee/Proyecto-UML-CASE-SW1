import { type CrearUsuarioDatos, type Usuario } from '../models/usuario';

export abstract class UsuarioRepository {
  abstract buscarPorCorreo(correo: string): Promise<Usuario | null>;

  abstract crear(datos: CrearUsuarioDatos): Promise<Usuario>;

  abstract actualizarUltimaConexion(
    idUsuario: string,
    fecha: Date,
  ): Promise<void>;
}
