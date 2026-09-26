import { Injectable } from '@nestjs/common';
import { OperacionProyectoNoAutorizadaError } from '../../../domain/errors/operacion-proyecto-no-autorizada.error';
import { ProyectoNoEncontradoError } from '../../../domain/errors/proyecto-no-encontrado.error';
import { type Proyecto } from '../../../domain/models/proyecto';
import { ProyectoRepository } from '../../../domain/repositories/proyecto.repository';

export interface ModificarProyectoEntrada {
  idProyecto: string;
  idUsuario: string;
  nombre: string;
  descripcion?: string | null;
  configuracion?: Record<string, unknown>;
}

@Injectable()
export class ModificarProyectoUseCase {
  constructor(private readonly proyectoRepository: ProyectoRepository) {}

  async execute(entrada: ModificarProyectoEntrada): Promise<Proyecto> {
    const proyecto = await this.proyectoRepository.buscarPorId(
      entrada.idProyecto,
    );

    if (!proyecto) {
      throw new ProyectoNoEncontradoError();
    }

    const esAnfitrion = await this.proyectoRepository.esAnfitrionActivo(
      entrada.idProyecto,
      entrada.idUsuario,
    );

    if (!esAnfitrion) {
      throw new OperacionProyectoNoAutorizadaError();
    }

    const descripcion =
      entrada.descripcion === undefined
        ? proyecto.descripcion
        : entrada.descripcion?.trim() || null;

    const actualizado = await this.proyectoRepository.actualizar(
      entrada.idProyecto,
      {
        nombre: entrada.nombre.trim(),
        descripcion,
        configuracion: entrada.configuracion ?? proyecto.configuracion,
      },
    );

    if (!actualizado) {
      throw new ProyectoNoEncontradoError();
    }

    return actualizado;
  }
}
