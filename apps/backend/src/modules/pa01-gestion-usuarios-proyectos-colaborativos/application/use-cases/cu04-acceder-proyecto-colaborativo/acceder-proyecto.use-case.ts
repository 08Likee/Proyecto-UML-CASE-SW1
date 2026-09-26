import { ForbiddenException, Injectable } from '@nestjs/common';

import { AccesoProyectoRepository } from '../../../domain/repositories/acceso-proyecto.repository';

@Injectable()
export class AccederProyectoUseCase {
  constructor(private readonly repository: AccesoProyectoRepository) {}

  async execute(idUsuario: string, idProyecto: string) {
    const acceso = await this.repository.obtenerAcceso(idProyecto, idUsuario);

    if (!acceso) {
      throw new ForbiddenException(
        'El usuario no posee acceso activo al proyecto',
      );
    }

    return acceso;
  }
}
