import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import {
  crearContenidoModeloUmlVacio,
  type ModeloUml,
} from '../../../domain/models/modelo-uml';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';
import { validarContenidoModeloUml } from '../../../domain/services/validar-contenido-modelo-uml';

export interface CrearModeloUmlEntrada {
  idUsuario: string;
  idProyecto: string;
  nombre: string;
  descripcion?: string | null;
  contenido?: unknown;
}

@Injectable()
export class CrearModeloUmlUseCase {
  constructor(
    private readonly repository: ModeloUmlRepository,
    private readonly autorizacion: AutorizacionProyectoService,
  ) {}

  async execute(entrada: CrearModeloUmlEntrada): Promise<ModeloUml> {
    await this.autorizacion.exigirPermiso(
      entrada.idUsuario,
      entrada.idProyecto,
      PERMISOS_MODELO.EDITAR.recurso,
      PERMISOS_MODELO.EDITAR.accion,
    );

    const contenido = validarContenidoModeloUml(
      entrada.contenido ?? crearContenidoModeloUmlVacio(),
    );

    return this.repository.crear({
      idProyecto: entrada.idProyecto,
      nombre: entrada.nombre.trim(),
      descripcion: entrada.descripcion?.trim() || null,
      contenido,
    });
  }
}
