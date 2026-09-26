import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';
import { ParticipanteRepository } from '../../../domain/repositories/participante.repository';

@Injectable()
export class RetirarParticipanteUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,

    private readonly participanteRepository: ParticipanteRepository,
  ) {}

  async execute(
    idUsuarioAnfitrion: string,
    idProyecto: string,
    idMembresia: string,
  ): Promise<void> {
    await this.autorizacion.exigirPermiso(
      idUsuarioAnfitrion,
      idProyecto,
      PERMISOS.PARTICIPANTE.RETIRAR.recurso,
      PERMISOS.PARTICIPANTE.RETIRAR.accion,
    );

    const membresia = await this.participanteRepository.buscarMembresiaActiva(
      idProyecto,
      idMembresia,
    );

    if (!membresia) {
      throw new NotFoundException(
        'El participante ya no pertenece al proyecto',
      );
    }

    if (membresia.rolPredeterminado && membresia.rolNombre === 'Anfitrión') {
      throw new BadRequestException(
        'No se puede retirar al Anfitrión predeterminado del proyecto',
      );
    }

    const retirado = await this.participanteRepository.retirar(
      idProyecto,
      idMembresia,
    );

    if (!retirado) {
      throw new NotFoundException(
        'El participante ya no pertenece al proyecto',
      );
    }
  }
}
