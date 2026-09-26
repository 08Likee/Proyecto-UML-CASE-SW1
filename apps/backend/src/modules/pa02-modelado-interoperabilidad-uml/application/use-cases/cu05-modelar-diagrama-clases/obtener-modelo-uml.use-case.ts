import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ModeloUmlNoEncontradoError } from '../../../domain/errors/modelo-uml-no-encontrado.error';
import { type ModeloUml } from '../../../domain/models/modelo-uml';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';

@Injectable()
export class ObtenerModeloUmlUseCase {
  constructor(
    private readonly repository: ModeloUmlRepository,
    private readonly autorizacion: AutorizacionProyectoService,
  ) {}

  async execute(
    idUsuario: string,
    idProyecto: string,
    idModelo: string,
  ): Promise<ModeloUml> {
    await this.autorizacion.exigirPermiso(
      idUsuario,
      idProyecto,
      PERMISOS_MODELO.CONSULTAR.recurso,
      PERMISOS_MODELO.CONSULTAR.accion,
    );

    const modelo = await this.repository.buscarActivoPorIdYProyecto(
      idModelo,
      idProyecto,
    );

    if (!modelo) {
      throw new ModeloUmlNoEncontradoError();
    }

    return modelo;
  }
}
