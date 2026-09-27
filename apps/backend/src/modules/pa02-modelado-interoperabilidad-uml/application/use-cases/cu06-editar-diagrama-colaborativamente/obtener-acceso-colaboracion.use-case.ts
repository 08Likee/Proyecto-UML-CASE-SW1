import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { OperacionProyectoNoAutorizadaError } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import { ModeloUmlNoEncontradoError } from '../../../domain/errors/modelo-uml-no-encontrado.error';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';

@Injectable()
export class ObtenerAccesoColaboracionUseCase {
  constructor(
    private readonly autorizacionProyectoService: AutorizacionProyectoService,
    private readonly modeloUmlRepository: ModeloUmlRepository,
  ) {}

  async execute(idUsuario: string, idProyecto: string, idModelo: string) {
    const puedeConsultar = await this.autorizacionProyectoService.tienePermiso(
      idUsuario,
      idProyecto,
      PERMISOS_MODELO.CONSULTAR.recurso,
      PERMISOS_MODELO.CONSULTAR.accion,
    );

    if (!puedeConsultar) {
      throw new OperacionProyectoNoAutorizadaError();
    }

    const modelo = await this.modeloUmlRepository.buscarActivoPorIdYProyecto(
      idModelo,
      idProyecto,
    );

    if (!modelo) {
      throw new ModeloUmlNoEncontradoError();
    }

    const puedeEditar = await this.autorizacionProyectoService.tienePermiso(
      idUsuario,
      idProyecto,
      PERMISOS_MODELO.EDITAR.recurso,
      PERMISOS_MODELO.EDITAR.accion,
    );

    return {
      idUsuario,
      idProyecto,
      idModelo,
      puedeConsultar: true as const,
      puedeEditar,
      version: modelo.version,
    };
  }
}
