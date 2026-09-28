import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ModeloUmlRepository } from '../../../../pa02-modelado-interoperabilidad-uml/domain/repositories/modelo-uml.repository';
import { ModeloGeneracionNoEncontradoError } from '../../../domain/errors/modelo-generacion-no-encontrado.error';
import { PERMISO_GENERAR_BACKEND } from '../../../domain/models/permiso-generacion';
import { validarModeloParaGeneracion } from '../../../domain/services/validar-modelo-generacion';

@Injectable()
export class ValidarGeneracionBackendUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,
    private readonly modelos: ModeloUmlRepository,
  ) {}

  async execute(idUsuario: string, idProyecto: string, idModelo: string) {
    await this.autorizacion.exigirPermiso(
      idUsuario,
      idProyecto,
      PERMISO_GENERAR_BACKEND.recurso,
      PERMISO_GENERAR_BACKEND.accion,
    );

    const modelo = await this.modelos.buscarActivoPorIdYProyecto(
      idModelo,
      idProyecto,
    );
    if (!modelo) {
      throw new ModeloGeneracionNoEncontradoError();
    }

    return validarModeloParaGeneracion(modelo);
  }
}
