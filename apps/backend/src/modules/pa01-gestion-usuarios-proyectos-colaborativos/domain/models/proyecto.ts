export type ProyectoEstado = 'ACTIVO' | 'INACTIVO' | 'ARCHIVADO';

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  fechaCreacion: Date;
  estado: ProyectoEstado;
  configuracion: Record<string, unknown>;
  fechaActualizacion: Date;
}
