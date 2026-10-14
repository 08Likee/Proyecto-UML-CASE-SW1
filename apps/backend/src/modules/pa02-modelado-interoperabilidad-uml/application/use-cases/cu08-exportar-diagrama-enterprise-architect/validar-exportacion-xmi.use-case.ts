import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ModeloUmlNoEncontradoError } from '../../../domain/errors/modelo-uml-no-encontrado.error';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';
import { validarModeloParaExportacionXmi } from '../../../domain/services/validar-modelo-exportacion-xmi';

@Injectable()
export class ValidarExportacionXmiUseCase {
  constructor(
    private readonly repository: ModeloUmlRepository,
    private readonly autorizacion: AutorizacionProyectoService,
  ) {}

  async execute(idUsuario: string, idProyecto: string, idModelo: string) {
    await this.autorizacion.exigirPermiso(
      idUsuario,
      idProyecto,
      PERMISOS_MODELO.EXPORTAR.recurso,
      PERMISOS_MODELO.EXPORTAR.accion,
    );

    const modelo = await this.repository.buscarActivoPorIdYProyecto(
      idModelo,
      idProyecto,
    );

    if (!modelo) {
      throw new ModeloUmlNoEncontradoError();
    }

    return validarModeloParaExportacionXmi(modelo);
  }
}
