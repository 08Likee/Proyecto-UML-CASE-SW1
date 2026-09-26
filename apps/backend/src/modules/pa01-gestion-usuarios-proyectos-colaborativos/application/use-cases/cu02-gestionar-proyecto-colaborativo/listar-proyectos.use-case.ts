import { Injectable } from '@nestjs/common';
import { type Proyecto } from '../../../domain/models/proyecto';
import { ProyectoRepository } from '../../../domain/repositories/proyecto.repository';

@Injectable()
export class ListarProyectosUseCase {
  constructor(private readonly proyectoRepository: ProyectoRepository) {}

  execute(idUsuario: string): Promise<Proyecto[]> {
    return this.proyectoRepository.listarPorUsuario(idUsuario);
  }
}
