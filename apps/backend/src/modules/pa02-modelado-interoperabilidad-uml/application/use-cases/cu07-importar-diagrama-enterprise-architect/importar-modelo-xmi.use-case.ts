import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ModeloNoImportableXmiError } from '../../../domain/errors/modelo-no-importable-xmi.error';
import type { ModeloUml } from '../../../domain/models/modelo-uml';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';
import { analizarImportacionXmiEnterpriseArchitect } from '../../../domain/services/analizar-importacion-xmi-enterprise-architect';
import { validarContenidoModeloUml } from '../../../domain/services/validar-contenido-modelo-uml';

export interface ImportarModeloXmiEntrada {
  idUsuario: string;
  idProyecto: string;
  archivo: Buffer;
  nombre?: string | null;
}

@Injectable()
export class ImportarModeloXmiUseCase {
  constructor(
    private readonly repository: ModeloUmlRepository,
    private readonly autorizacion: AutorizacionProyectoService,
  ) {}

  async execute(entrada: ImportarModeloXmiEntrada): Promise<ModeloUml> {
    await this.autorizacion.exigirPermiso(
      entrada.idUsuario,
      entrada.idProyecto,
      PERMISOS_MODELO.IMPORTAR.recurso,
      PERMISOS_MODELO.IMPORTAR.accion,
    );

    const analisis = analizarImportacionXmiEnterpriseArchitect(entrada.archivo);
    if (!analisis.validacion.valido || !analisis.contenido) {
      throw new ModeloNoImportableXmiError(analisis.validacion);
    }

    const contenido = validarContenidoModeloUml(analisis.contenido);
    const nombreSolicitado = entrada.nombre?.trim();
    const nombre = (nombreSolicitado || analisis.validacion.nombreSugerido).slice(0, 150);

    return this.repository.crear({
      idProyecto: entrada.idProyecto,
      nombre: nombre || 'Modelo importado',
      descripcion: 'Importado desde XMI de Enterprise Architect',
      contenido,
    });
  }
}
