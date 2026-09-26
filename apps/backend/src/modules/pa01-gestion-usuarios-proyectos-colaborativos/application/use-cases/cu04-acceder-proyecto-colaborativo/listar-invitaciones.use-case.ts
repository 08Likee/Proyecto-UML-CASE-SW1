import { Injectable } from '@nestjs/common';

import { AccesoProyectoRepository } from '../../../domain/repositories/acceso-proyecto.repository';

@Injectable()
export class ListarInvitacionesUseCase {
  constructor(private readonly repository: AccesoProyectoRepository) {}

  execute(idUsuario: string) {
    return this.repository.listarInvitacionesPendientes(idUsuario);
  }
}
