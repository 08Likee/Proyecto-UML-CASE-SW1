import { Injectable } from '@nestjs/common';
import { OperacionProyectoNoAutorizadaError } from '../../domain/errors/operacion-proyecto-no-autorizada.error';
import { AutorizacionProyectoRepository } from '../../domain/repositories/autorizacion-proyecto.repository';

@Injectable()
export class AutorizacionProyectoService {
  constructor(private readonly repository: AutorizacionProyectoRepository) {}

  async tienePermiso(
    idUsuario: string,
    idProyecto: string,
    recurso: string,
    accion: string,
    permitirProyectoEliminado = false,
  ): Promise<boolean> {
    return this.repository.tienePermiso(
      idUsuario,
      idProyecto,
      recurso,
      accion,
      permitirProyectoEliminado,
    );
  }

  async exigirPermiso(
    idUsuario: string,
    idProyecto: string,
    recurso: string,
    accion: string,
  ): Promise<void> {
    const permitido = await this.repository.tienePermiso(
      idUsuario,
      idProyecto,
      recurso,
      accion,
    );

    if (!permitido) {
      throw new OperacionProyectoNoAutorizadaError();
    }
  }
}
