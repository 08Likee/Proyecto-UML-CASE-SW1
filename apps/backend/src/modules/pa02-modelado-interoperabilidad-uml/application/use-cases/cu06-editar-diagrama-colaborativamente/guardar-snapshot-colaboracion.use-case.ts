import { Injectable } from '@nestjs/common';
import { ModeloUmlNoEncontradoError } from '../../../domain/errors/modelo-uml-no-encontrado.error';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';
import { validarContenidoModeloUml } from '../../../domain/services/validar-contenido-modelo-uml';

export interface GuardarSnapshotColaboracionEntrada {
  idProyecto: string;
  idModelo: string;
  contenido: unknown;
  estadoYjsBase64: string;
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
      );

    if (!modelo) {
      throw new ModeloUmlNoEncontradoError();
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
