import { ConflictException, Injectable } from '@nestjs/common';

import { AccesoProyectoRepository } from '../../../domain/repositories/acceso-proyecto.repository';

@Injectable()
export class AceptarInvitacionUseCase {
  constructor(private readonly repository: AccesoProyectoRepository) {}

  async execute(idUsuario: string, idInvitacion: string) {
    const resultado = await this.repository.aceptarInvitacion(
      idInvitacion,
      idUsuario,
    );

    switch (resultado.tipo) {
      case 'ACEPTADA':
        return resultado.datos;

      case 'YA_MIEMBRO':
        throw new ConflictException('El usuario ya pertenece al proyecto');

      case 'PROYECTO_NO_DISPONIBLE':
        throw new ConflictException(
          'El proyecto asociado a la invitación ya no se encuentra disponible',
        );

      case 'ROL_NO_DISPONIBLE':
        throw new ConflictException(
          'El rol asignado a la invitación ya no se encuentra disponible',
        );

      case 'NO_DISPONIBLE':
      default:
        throw new ConflictException(
          'La invitación ya no existe, expiró o dejó de encontrarse pendiente',
        );
    }
  }
}
