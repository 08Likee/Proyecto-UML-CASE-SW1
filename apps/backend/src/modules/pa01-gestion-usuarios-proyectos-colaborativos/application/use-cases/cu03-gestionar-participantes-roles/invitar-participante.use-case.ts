import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';

import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';
import { ParticipanteRepository } from '../../../domain/repositories/participante.repository';

const INVITACION_DURACION_DIAS = 7;

export interface InvitarParticipanteEntrada {
  idUsuarioAnfitrion: string;
  idProyecto: string;
  correo: string;
  idRol: string;
}

@Injectable()
export class InvitarParticipanteUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,

    private readonly participanteRepository: ParticipanteRepository,
  ) {}

  async execute(entrada: InvitarParticipanteEntrada) {
    await this.autorizacion.exigirPermiso(
      entrada.idUsuarioAnfitrion,
      entrada.idProyecto,
      PERMISOS.PARTICIPANTE.INVITAR.recurso,
      PERMISOS.PARTICIPANTE.INVITAR.accion,
    );

    const usuario = await this.participanteRepository.buscarUsuarioPorCorreo(
      entrada.correo.trim().toLowerCase(),
    );

    if (!usuario) {
      throw new NotFoundException(
        'El usuario que se intenta invitar no pudo ser identificado',
      );
    }

    const estadoMembresia =
      await this.participanteRepository.obtenerEstadoMembresia(
        entrada.idProyecto,
        usuario.id,
      );

    if (estadoMembresia && estadoMembresia !== 'RETIRADA') {
      throw new ConflictException('El usuario ya pertenece al proyecto');
    }

    const invitacionPendiente =
      await this.participanteRepository.tieneInvitacionPendiente(
        entrada.idProyecto,
        usuario.id,
      );

    if (invitacionPendiente) {
      throw new ConflictException(
        'El usuario ya posee una invitación pendiente para este proyecto',
      );
    }

    const rolValido = await this.participanteRepository.rolAsignableExiste(
      entrada.idProyecto,
      entrada.idRol,
    );

    if (!rolValido) {
      throw new BadRequestException(
        'El rol seleccionado no existe, no está disponible o no puede asignarse mediante invitación',
      );
    }

    const fechaExpiracion = new Date(
      Date.now() + INVITACION_DURACION_DIAS * 24 * 60 * 60 * 1000,
    );

    const invitacion = await this.participanteRepository.crearInvitacion({
      token: randomUUID(),
      fechaExpiracion,
      idProyecto: entrada.idProyecto,
      idUsuario: usuario.id,
      idRol: entrada.idRol,
    });

    if (!invitacion) {
      throw new ConflictException(
        'No fue posible crear la invitación porque ya existe una equivalente pendiente',
      );
    }

    return {
      ...invitacion,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
      },
    };
  }
}
