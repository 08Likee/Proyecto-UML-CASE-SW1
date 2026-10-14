import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ModeloNoExportableXmiError } from '../../../domain/errors/modelo-no-exportable-xmi.error';
import { ModeloUmlNoEncontradoError } from '../../../domain/errors/modelo-uml-no-encontrado.error';
import { PERMISOS_MODELO } from '../../../domain/models/permiso-modelo';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';
import { generarXmiEnterpriseArchitect } from '../../../domain/services/generar-xmi-enterprise-architect';
import { validarModeloParaExportacionXmi } from '../../../domain/services/validar-modelo-exportacion-xmi';

export interface ArchivoXmiGenerado {
  nombreArchivo: string;
  contenido: Buffer;
}

function slugArchivo(valor: string): string {
  const slug = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'modelo-uml';
}

@Injectable()
export class ExportarModeloXmiUseCase {
  constructor(
    private readonly repository: ModeloUmlRepository,
    private readonly autorizacion: AutorizacionProyectoService,
  ) {}

  async execute(
    idUsuario: string,
    idProyecto: string,
    idModelo: string,
  ): Promise<ArchivoXmiGenerado> {
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

    const validacion = validarModeloParaExportacionXmi(modelo);
    if (!validacion.valido) {
      throw new ModeloNoExportableXmiError(validacion);
    }

    const xmi = generarXmiEnterpriseArchitect(modelo);

    return {
      nombreArchivo: `${slugArchivo(modelo.nombre)}.xmi`,
      contenido: Buffer.from(xmi, 'utf8'),
    };
  }
}
