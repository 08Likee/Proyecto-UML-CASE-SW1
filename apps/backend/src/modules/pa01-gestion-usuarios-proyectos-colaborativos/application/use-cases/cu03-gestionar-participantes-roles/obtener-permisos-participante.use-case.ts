import { Injectable, NotFoundException } from '@nestjs/common';

import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';
import { ParticipanteRepository } from '../../../domain/repositories/participante.repository';

@Injectable()
export class ObtenerPermisosParticipanteUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,

    private readonly participanteRepository: ParticipanteRepository,
  ) {}

  async execute(
    idUsuarioAnfitrion: string,
    idProyecto: string,
    idMembresia: string,
  ) {
    await this.autorizacion.exigirPermiso(
      idUsuarioAnfitrion,
      idProyecto,
      PERMISOS.PARTICIPANTE.ASIGNAR_PERMISO.recurso,
      PERMISOS.PARTICIPANTE.ASIGNAR_PERMISO.accion,
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

    return this.participanteRepository.listarPermisosEfectivos(idMembresia);
  }
}
