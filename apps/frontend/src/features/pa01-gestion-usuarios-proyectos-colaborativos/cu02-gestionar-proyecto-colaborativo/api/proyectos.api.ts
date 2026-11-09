import { apiRequest } from '../../../../shared/api/http';

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  fechaCreacion: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'ARCHIVADO';
  configuracion: Record<string, unknown>;
  fechaActualizacion: string;
}

export interface ElementoPapelera {
  id: string;
  nombre: string;
  fechaEliminacion: string;
  fechaPurga: string;
  estadoAnterior: string;
}

export function listarProyectosPapelera(): Promise<ElementoPapelera[]> {
  return apiRequest<ElementoPapelera[]>('/proyectos/papelera');
}

export function moverProyectoPapelera(id: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/proyectos/${id}`, { method: 'DELETE' });
}

export function restaurarProyectoPapelera(id: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/proyectos/${id}/restaurar`, { method: 'POST' });
}

export interface CrearProyectoEntrada {
  nombre: string;
  descripcion?: string;
  configuracion?: Record<string, unknown>;
}

export interface ModificarProyectoEntrada {
  nombre: string;
  descripcion?: string | null;
  configuracion?: Record<string, unknown>;
}

export interface PermisoEfectivo {
  idPermiso: string;
  nombre: string;
  recurso: string;
  accion: string;
  permitido: boolean;
  fuente: 'ROL' | 'CONCEDER' | 'DENEGAR' | 'NINGUNO';
}

export interface AccesoProyecto {
  proyecto: Proyecto;
  membresia: {
    id: string;
    estado: string;
  };
  rol: {
    id: string;
    nombre: string;
    esPredeterminado: boolean;
  };
  permisos: PermisoEfectivo[];
}

export function crearProyecto(entrada: CrearProyectoEntrada): Promise<Proyecto> {
  return apiRequest<Proyecto>('/proyectos', {
    method: 'POST',
    body: JSON.stringify(entrada),
  });
}

export function listarProyectos(): Promise<Proyecto[]> {
  return apiRequest<Proyecto[]>('/proyectos');
}

export function obtenerProyecto(idProyecto: string): Promise<Proyecto> {
  return apiRequest<Proyecto>(`/proyectos/${idProyecto}`);
}

export function modificarProyecto(
  idProyecto: string,
  entrada: ModificarProyectoEntrada,
): Promise<Proyecto> {
  return apiRequest<Proyecto>(`/proyectos/${idProyecto}`, {
    method: 'PUT',
    body: JSON.stringify(entrada),
  });
}

export function obtenerAccesoProyecto(
  idProyecto: string,
): Promise<AccesoProyecto> {
  return apiRequest<AccesoProyecto>(`/proyectos/${idProyecto}/acceso`);
}
