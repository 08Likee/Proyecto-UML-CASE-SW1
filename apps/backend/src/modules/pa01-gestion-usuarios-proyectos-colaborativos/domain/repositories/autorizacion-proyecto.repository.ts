export abstract class AutorizacionProyectoRepository {
  abstract tienePermiso(
    idUsuario: string,
    idProyecto: string,
    recurso: string,
    accion: string,
  ): Promise<boolean>;
}
