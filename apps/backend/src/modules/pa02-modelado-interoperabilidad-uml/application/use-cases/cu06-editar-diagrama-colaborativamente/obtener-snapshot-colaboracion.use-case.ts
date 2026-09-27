import { Injectable } from '@nestjs/common';
import { ModeloUmlNoEncontradoError } from '../../../domain/errors/modelo-uml-no-encontrado.error';
import { ModeloUmlRepository } from '../../../domain/repositories/modelo-uml.repository';

@Injectable()
export class ObtenerSnapshotColaboracionUseCase {
  constructor(private readonly modeloUmlRepository: ModeloUmlRepository) {}

  async execute(idProyecto: string, idModelo: string) {
    const snapshot =
      await this.modeloUmlRepository.buscarSnapshotColaborativoPorIdYProyecto(
        idModelo,
        idProyecto,
      );

    if (!snapshot) {
      throw new ModeloUmlNoEncontradoError();
    }

    return {
      idProyecto,
      idModelo,
      version: snapshot.modelo.version,
      contenido: snapshot.modelo.contenido,
      estadoYjsBase64: snapshot.estadoYjsBase64,
    };
  }
}
