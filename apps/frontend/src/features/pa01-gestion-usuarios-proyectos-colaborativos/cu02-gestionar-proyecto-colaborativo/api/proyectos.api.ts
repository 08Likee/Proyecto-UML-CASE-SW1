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

export function listarProyectos(): Promise<Proyecto[]> {
  return apiRequest<Proyecto[]>('/proyectos');
}

export function obtenerAccesoProyecto(
  idProyecto: string,
): Promise<AccesoProyecto> {
  return apiRequest<AccesoProyecto>(`/proyectos/${idProyecto}/acceso`);
}
