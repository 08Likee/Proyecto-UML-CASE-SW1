import { type AccesoProyecto } from '../models/acceso-proyecto';

import {
  type InvitacionAceptada,
  type InvitacionRecibida,
} from '../models/invitacion';

export type ResultadoAceptarInvitacion =
  | {
      tipo: 'ACEPTADA';
      datos: InvitacionAceptada;
    }
  | {
      tipo:
        | 'NO_DISPONIBLE'
        | 'YA_MIEMBRO'
        | 'PROYECTO_NO_DISPONIBLE'
        | 'ROL_NO_DISPONIBLE';
    };

export type ResultadoRechazarInvitacion = 'RECHAZADA' | 'NO_DISPONIBLE';

export abstract class AccesoProyectoRepository {
  abstract listarInvitacionesPendientes(
    idUsuario: string,
  ): Promise<InvitacionRecibida[]>;

  abstract aceptarInvitacion(
    idInvitacion: string,
    idUsuario: string,
  ): Promise<ResultadoAceptarInvitacion>;

  abstract rechazarInvitacion(
    idInvitacion: string,
    idUsuario: string,
  ): Promise<ResultadoRechazarInvitacion>;

  abstract obtenerAcceso(
    idProyecto: string,
    idUsuario: string,
  ): Promise<AccesoProyecto | null>;
}
