import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';
import { ParticipanteRepository } from '../../../domain/repositories/participante.repository';

export interface CambiarRolParticipanteEntrada {
  idUsuarioAnfitrion: string;
  idProyecto: string;
  idMembresia: string;
  idRol: string;
}

@Injectable()
export class CambiarRolParticipanteUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,

    private readonly participanteRepository: ParticipanteRepository,
  ) {}

  async execute(entrada: CambiarRolParticipanteEntrada) {
    await this.autorizacion.exigirPermiso(
      entrada.idUsuarioAnfitrion,
      entrada.idProyecto,
      PERMISOS.PARTICIPANTE.CAMBIAR_ROL.recurso,
      PERMISOS.PARTICIPANTE.CAMBIAR_ROL.accion,
    );

    const membresia = await this.participanteRepository.buscarMembresiaActiva(
      entrada.idProyecto,
      entrada.idMembresia,
    );

    if (!membresia) {
      throw new NotFoundException(
        'El participante ya no pertenece al proyecto',
      );
    }

    if (membresia.rolPredeterminado && membresia.rolNombre === 'Anfitrión') {
      throw new BadRequestException(
        'No se puede modificar el rol del Anfitrión predeterminado',
      );
    }

    const rolValido = await this.participanteRepository.rolAsignableExiste(
      entrada.idProyecto,
      entrada.idRol,
    );

    if (!rolValido) {
      throw new BadRequestException(
        'El rol seleccionado no existe o no se encuentra disponible',
      );
    }

    const actualizado = await this.participanteRepository.cambiarRol(
      entrada.idProyecto,
      entrada.idMembresia,
      entrada.idRol,
    );

    if (!actualizado) {
      throw new NotFoundException(
        'El participante ya no pertenece al proyecto',
      );
    }

    return {
      message: 'El rol del participante fue actualizado correctamente.',
    };
  }
}
