import { apiRequest } from '../../../../shared/api/http';

export interface RolProyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  esPredeterminado: boolean;
  estado: 'ACTIVO' | 'INACTIVO';
  fechaCreacion: string;
  fechaActualizacion: string;
  idProyecto: string;
}

export interface PermisoDisponible {
  id: string;
  nombre: string;
  descripcion: string | null;
  recurso: string;
  accion: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface ParticipanteProyecto {
  idMembresia: string;
  idUsuario: string;
  nombre: string;
  apellido: string;
  correo: string;
  estadoMembresia: string;
  idRol: string;
  rolNombre: string;
  rolPredeterminado: boolean;
}

export type FuentePermisoEfectivo =
  | 'ROL'
  | 'CONCEDER'
  | 'DENEGAR'
  | 'NINGUNO';

export interface PermisoEfectivoParticipante {
  idPermiso: string;
  nombre: string;
  recurso: string;
  accion: string;
  permitido: boolean;
  fuente: FuentePermisoEfectivo;
}

export interface InvitacionCreada {
  id: string;
  estado: string;
  fechaCreacion: string;
  fechaExpiracion: string;
  idProyecto: string;
  idUsuario: string;
  idRol: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    correo: string;
  };
}

export interface CrearRolEntrada {
  nombre: string;
  descripcion?: string;
  permisosIds: string[];
}

export function listarRoles(idProyecto: string): Promise<RolProyecto[]> {
  return apiRequest<RolProyecto[]>(`/proyectos/${idProyecto}/roles`);
}

export function listarPermisos(
  idProyecto: string,
): Promise<PermisoDisponible[]> {
  return apiRequest<PermisoDisponible[]>(`/proyectos/${idProyecto}/permisos`);
}

export function crearRol(
  idProyecto: string,
  entrada: CrearRolEntrada,
): Promise<RolProyecto> {
  return apiRequest<RolProyecto>(`/proyectos/${idProyecto}/roles`, {
    method: 'POST',
    body: JSON.stringify(entrada),
  });
}

export function listarParticipantes(
  idProyecto: string,
): Promise<ParticipanteProyecto[]> {
  return apiRequest<ParticipanteProyecto[]>(
    `/proyectos/${idProyecto}/participantes`,
  );
}

export function invitarParticipante(
  idProyecto: string,
  correo: string,
  idRol: string,
): Promise<InvitacionCreada> {
  return apiRequest<InvitacionCreada>(
    `/proyectos/${idProyecto}/invitaciones`,
    {
      method: 'POST',
      body: JSON.stringify({ correo, idRol }),
    },
  );
}

export function cambiarRolParticipante(
  idProyecto: string,
  idMembresia: string,
  idRol: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/proyectos/${idProyecto}/participantes/${idMembresia}/rol`,
    {
      method: 'PUT',
      body: JSON.stringify({ idRol }),
    },
  );
}

export function retirarParticipante(
  idProyecto: string,
  idMembresia: string,
): Promise<void> {
  return apiRequest<void>(
    `/proyectos/${idProyecto}/participantes/${idMembresia}`,
    { method: 'DELETE' },
  );
}

export function obtenerPermisosParticipante(
  idProyecto: string,
  idMembresia: string,
): Promise<PermisoEfectivoParticipante[]> {
  return apiRequest<PermisoEfectivoParticipante[]>(
    `/proyectos/${idProyecto}/participantes/${idMembresia}/permisos`,
  );
}

export function asignarPermisoParticular(
  idProyecto: string,
  idMembresia: string,
  idPermiso: string,
  tipoAsignacion: 'CONCEDER' | 'DENEGAR',
): Promise<PermisoEfectivoParticipante[]> {
  return apiRequest<PermisoEfectivoParticipante[]>(
    `/proyectos/${idProyecto}/participantes/${idMembresia}/permisos/${idPermiso}`,
    {
      method: 'PUT',
      body: JSON.stringify({ tipoAsignacion }),
    },
  );
}
