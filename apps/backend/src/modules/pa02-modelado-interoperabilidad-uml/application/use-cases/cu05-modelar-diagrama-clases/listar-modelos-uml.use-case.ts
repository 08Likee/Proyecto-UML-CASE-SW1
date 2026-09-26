import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { type ModeloUmlResumen } from '../../../domain/models/modelo-uml';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';

@Injectable()
export class ListarModelosUmlUseCase {
  constructor(
    private readonly repository: ModeloUmlRepository,
    private readonly autorizacion: AutorizacionProyectoService,
  ) {}

  async execute(
    idUsuario: string,
    idProyecto: string,
  ): Promise<ModeloUmlResumen[]> {
    await this.autorizacion.exigirPermiso(
      idUsuario,
      idProyecto,
      PERMISOS_MODELO.CONSULTAR.recurso,
      PERMISOS_MODELO.CONSULTAR.accion,
    );

    return this.repository.listarActivosPorProyecto(idProyecto);
  }
}
