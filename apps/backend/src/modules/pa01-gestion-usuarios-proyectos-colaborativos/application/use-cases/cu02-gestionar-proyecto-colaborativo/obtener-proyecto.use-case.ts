import { Injectable } from '@nestjs/common';
import { OperacionProyectoNoAutorizadaError } from '../../../domain/errors/operacion-proyecto-no-autorizada.error';
import { ProyectoNoEncontradoError } from '../../../domain/errors/proyecto-no-encontrado.error';
import { type Proyecto } from '../../../domain/models/proyecto';
import { ProyectoRepository } from '../../../domain/repositories/proyecto.repository';

@Injectable()
export class ObtenerProyectoUseCase {
  constructor(private readonly proyectoRepository: ProyectoRepository) {}

  async execute(idProyecto: string, idUsuario: string): Promise<Proyecto> {
    const proyecto = await this.proyectoRepository.buscarPorId(idProyecto);

    if (!proyecto) {
      throw new ProyectoNoEncontradoError();
    }

    const esMiembro = await this.proyectoRepository.esMiembroActivo(
      idProyecto,
      idUsuario,
    );

    if (!esMiembro) {
      throw new OperacionProyectoNoAutorizadaError();
    }

    return proyecto;
  }
}
