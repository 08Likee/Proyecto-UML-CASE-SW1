import { ConflictException, Injectable } from '@nestjs/common';

import { AccesoProyectoRepository } from '../../../domain/repositories/acceso-proyecto.repository';

@Injectable()
export class RechazarInvitacionUseCase {
  constructor(private readonly repository: AccesoProyectoRepository) {}

  async execute(idUsuario: string, idInvitacion: string) {
    const resultado = await this.repository.rechazarInvitacion(
      idInvitacion,
      idUsuario,
    );

    if (resultado === 'NO_DISPONIBLE') {
      throw new ConflictException(
        'La invitación ya no existe, expiró o dejó de encontrarse pendiente',
      );
    }

    return {
      message: 'La invitación fue rechazada correctamente.',
    };
  }
}
