import { Injectable } from '@nestjs/common';

import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';
import { ParticipanteRepository } from '../../../domain/repositories/participante.repository';

@Injectable()
export class ListarParticipantesUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,

    private readonly participanteRepository: ParticipanteRepository,
  ) {}

  async execute(idUsuario: string, idProyecto: string) {
    await this.autorizacion.exigirPermiso(
      idUsuario,
      idProyecto,
      PERMISOS.PARTICIPANTE.CONSULTAR.recurso,
      PERMISOS.PARTICIPANTE.CONSULTAR.accion,
    );

    return this.participanteRepository.listarActivos(idProyecto);
  }
}
