import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ModeloUmlNoEncontradoError } from '../../../domain/errors/modelo-uml-no-encontrado.error';
import { ModeloUmlVersionConflictivaError } from '../../../domain/errors/modelo-uml-version-conflictiva.error';
import { type ModeloUml } from '../../../domain/models/modelo-uml';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';
import { validarContenidoModeloUml } from '../../../domain/services/validar-contenido-modelo-uml';

export interface GuardarModeloUmlEntrada {
  idUsuario: string;
  idProyecto: string;
  idModelo: string;
  nombre: string;
  descripcion?: string | null;
  contenido: unknown;
  version: number;
}

@Injectable()
export class GuardarModeloUmlUseCase {
  constructor(
    private readonly repository: ModeloUmlRepository,
    private readonly autorizacion: AutorizacionProyectoService,
  ) {}

  async execute(entrada: GuardarModeloUmlEntrada): Promise<ModeloUml> {
    await this.autorizacion.exigirPermiso(
      entrada.idUsuario,
      entrada.idProyecto,
      PERMISOS_MODELO.EDITAR.recurso,
      PERMISOS_MODELO.EDITAR.accion,
    );

    const actual = await this.repository.buscarActivoPorIdYProyecto(
      entrada.idModelo,
      entrada.idProyecto,
    );

    if (!actual) {
      throw new ModeloUmlNoEncontradoError();
    }

    const contenido = validarContenidoModeloUml(entrada.contenido);

    const resultado = await this.repository.actualizarSiVersionCoincide(
      entrada.idModelo,
      entrada.idProyecto,
      {
        nombre: entrada.nombre.trim(),
        descripcion:
          entrada.descripcion === undefined
            ? actual.descripcion
            : entrada.descripcion?.trim() || null,
        contenido,
        versionEsperada: entrada.version,
      },
    );

    if (resultado.tipo === 'NO_ENCONTRADO') {
      throw new ModeloUmlNoEncontradoError();
    }

    if (resultado.tipo === 'VERSION_CONFLICTIVA') {
      throw new ModeloUmlVersionConflictivaError();
    }

    return resultado.modelo;
  }
}
