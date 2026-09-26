export interface ActualizarContrasenaRecuperacionDatos {
  idUsuario: string;
  contrasenaHashActual: string;
  nuevaContrasenaHash: string;
  fechaRevocacion: Date;
}

export abstract class RecuperacionCuentaRepository {
  abstract buscarContrasenaHashPorUsuarioId(
    idUsuario: string,
  ): Promise<string | null>;

  abstract actualizarContrasenaYRevocarSesiones(
    datos: ActualizarContrasenaRecuperacionDatos,
  ): Promise<boolean>;
}
