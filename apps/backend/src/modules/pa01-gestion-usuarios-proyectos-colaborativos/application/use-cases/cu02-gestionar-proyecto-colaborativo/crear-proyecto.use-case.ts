import { Injectable } from '@nestjs/common';
import { type Proyecto } from '../../../domain/models/proyecto';
import { ProyectoRepository } from '../../../domain/repositories/proyecto.repository';

export interface CrearProyectoEntrada {
  idUsuario: string;
  nombre: string;
  descripcion?: string | null;
  configuracion?: Record<string, unknown>;
}

@Injectable()
export class CrearProyectoUseCase {
  constructor(private readonly proyectoRepository: ProyectoRepository) {}

  async execute(entrada: CrearProyectoEntrada): Promise<Proyecto> {
    const resultado = await this.proyectoRepository.crearConAnfitrion({
      idUsuario: entrada.idUsuario,
      nombre: entrada.nombre.trim(),
      descripcion: entrada.descripcion?.trim() || null,
      configuracion: entrada.configuracion ?? {},
    });

    return resultado.proyecto;
  }
}
