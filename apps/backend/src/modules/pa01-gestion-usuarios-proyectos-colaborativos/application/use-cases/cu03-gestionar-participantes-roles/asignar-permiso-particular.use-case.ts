import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';

import {
  ParticipanteRepository,
  type TipoAsignacionPermiso,
} from '../../../domain/repositories/participante.repository';

export interface AsignarPermisoParticularEntrada {
  idUsuarioAnfitrion: string;
  idProyecto: string;
  idMembresia: string;
  idPermiso: string;
  tipoAsignacion: TipoAsignacionPermiso;
}

@Injectable()
export class AsignarPermisoParticularUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,

    private readonly participanteRepository: ParticipanteRepository,
  ) {}

  async execute(entrada: AsignarPermisoParticularEntrada) {
    await this.autorizacion.exigirPermiso(
      entrada.idUsuarioAnfitrion,
      entrada.idProyecto,
      PERMISOS.PARTICIPANTE.ASIGNAR_PERMISO.recurso,
      PERMISOS.PARTICIPANTE.ASIGNAR_PERMISO.accion,
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
        'No se permiten excepciones particulares sobre el Anfitrión predeterminado',
      );
    }

    const permisoExiste = await this.participanteRepository.permisoActivoExiste(
      entrada.idPermiso,
    );

    if (!permisoExiste) {
      throw new BadRequestException(
        'El permiso seleccionado no existe o no se encuentra disponible',
      );
    }

    await this.participanteRepository.asignarPermisoParticular(
      entrada.idMembresia,
      entrada.idPermiso,
      entrada.tipoAsignacion,
    );

    return this.participanteRepository.listarPermisosEfectivos(
      entrada.idMembresia,
    );
  }
}
