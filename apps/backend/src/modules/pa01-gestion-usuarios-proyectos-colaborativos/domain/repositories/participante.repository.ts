import { type Invitacion } from '../models/invitacion';

import {
  type DetalleMembresia,
  type ParticipanteProyecto,
  type PermisoEfectivoParticipante,
} from '../models/participante';

export interface UsuarioInvitable {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
}

export interface CrearInvitacionDatos {
  token: string;
  fechaExpiracion: Date;
  idProyecto: string;
  idUsuario: string;
  idRol: string;
}

export type TipoAsignacionPermiso = 'CONCEDER' | 'DENEGAR';

export abstract class ParticipanteRepository {
  abstract listarActivos(idProyecto: string): Promise<ParticipanteProyecto[]>;

  abstract buscarUsuarioPorCorreo(
    correo: string,
  ): Promise<UsuarioInvitable | null>;

  abstract tieneMembresiaRegistrada(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean>;

  abstract tieneInvitacionPendiente(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean>;

  abstract rolAsignableExiste(
    idProyecto: string,
    idRol: string,
  ): Promise<boolean>;

  abstract crearInvitacion(
    datos: CrearInvitacionDatos,
  ): Promise<Invitacion | null>;

  abstract buscarMembresiaActiva(
    idProyecto: string,
    idMembresia: string,
  ): Promise<DetalleMembresia | null>;

  abstract cambiarRol(
    idProyecto: string,
    idMembresia: string,
    idRol: string,
  ): Promise<boolean>;

  abstract retirar(idProyecto: string, idMembresia: string): Promise<boolean>;

  abstract permisoActivoExiste(idPermiso: string): Promise<boolean>;

  abstract asignarPermisoParticular(
    idMembresia: string,
    idPermiso: string,
    tipoAsignacion: TipoAsignacionPermiso,
  ): Promise<void>;

  abstract listarPermisosEfectivos(
    idMembresia: string,
  ): Promise<PermisoEfectivoParticipante[]>;
}
