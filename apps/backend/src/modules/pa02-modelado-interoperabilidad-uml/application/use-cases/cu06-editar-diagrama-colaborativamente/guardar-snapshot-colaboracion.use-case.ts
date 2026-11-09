import { Injectable } from '@nestjs/common';
import { ModeloUmlVersionConflictivaError } from '../../../domain/errors/modelo-uml-version-conflictiva.error';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';
import { validarContenidoModeloUml } from '../../../domain/services/validar-contenido-modelo-uml';

export interface GuardarSnapshotColaboracionEntrada {
  idProyecto: string;
  idModelo: string;
  contenido: unknown;
  estadoYjsBase64: string;
  versionEsperada: number;
}

@Injectable()
export class GuardarSnapshotColaboracionUseCase {
  constructor(private readonly modeloUmlRepository: ModeloUmlRepository) {}

  async execute(entrada: GuardarSnapshotColaboracionEntrada) {
    const contenido = validarContenidoModeloUml(entrada.contenido);

    const modelo =
      await this.modeloUmlRepository.actualizarSnapshotColaborativo(
        entrada.idModelo,
        entrada.idProyecto,
        contenido,
        entrada.estadoYjsBase64,
        entrada.versionEsperada,
      );

    if (!modelo) {
      throw new ModeloUmlVersionConflictivaError();
    }

    return {
      idProyecto: entrada.idProyecto,
      idModelo: entrada.idModelo,
      version: modelo.version,
      contenido: modelo.contenido,
      estadoYjsBase64: entrada.estadoYjsBase64,
    };
  }
}
