import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ModeloUmlRepository } from '../../../../pa02-modelado-interoperabilidad-uml/domain/repositories/modelo-uml.repository';
import { ArchivoZipService } from '../../ports/archivo-zip.service';
import { ModeloGeneracionNoEncontradoError } from '../../../domain/errors/modelo-generacion-no-encontrado.error';
import { ModeloNoGenerableError } from '../../../domain/errors/modelo-no-generable.error';
import { PERMISO_GENERAR_BACKEND } from '../../../domain/models/permiso-generacion';
import { generarArchivosSpring } from '../../../domain/services/generar-archivos-spring';
import { transformarModeloABackend } from '../../../domain/services/transformar-modelo-backend';
import { validarModeloParaGeneracion } from '../../../domain/services/validar-modelo-generacion';

export interface BackendGenerado {
  nombreArchivo: string;
  contenido: Buffer;
}

@Injectable()
export class GenerarBackendUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,
    private readonly modelos: ModeloUmlRepository,
    private readonly zip: ArchivoZipService,
  ) {}

  async execute(
    idUsuario: string,
    idProyecto: string,
    idModelo: string,
  ): Promise<BackendGenerado> {
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

    const validacion = validarModeloParaGeneracion(modelo);
    if (!validacion.valido) {
      throw new ModeloNoGenerableError(validacion);
    }

    const especificacion = transformarModeloABackend(
      modelo,
      validacion.operacionesPendientes,
    );
    const archivos = generarArchivosSpring(especificacion);
    const contenido = await this.zip.crear(archivos);

    return {
      nombreArchivo: `${especificacion.artifactId}.zip`,
      contenido,
    };
  }
}
