import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { analizarImportacionXmiEnterpriseArchitect } from '../../../domain/services/analizar-importacion-xmi-enterprise-architect';

@Injectable()
export class ValidarImportacionXmiUseCase {
  constructor(private readonly autorizacion: AutorizacionProyectoService) {}

  async execute(idUsuario: string, idProyecto: string, archivo: Buffer) {
    await this.autorizacion.exigirPermiso(
      idUsuario,
      idProyecto,
      PERMISOS_MODELO.IMPORTAR.recurso,
      PERMISOS_MODELO.IMPORTAR.accion,
    );

    return analizarImportacionXmiEnterpriseArchitect(archivo).validacion;
  }
}
