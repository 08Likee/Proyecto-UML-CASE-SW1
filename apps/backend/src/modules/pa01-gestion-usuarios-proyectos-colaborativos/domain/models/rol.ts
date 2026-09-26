export type RolEstado = 'ACTIVO' | 'INACTIVO';

export const ROL_ANFITRION = 'Anfitrión';

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
  esPredeterminado: boolean;
  estado: RolEstado;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  idProyecto: string;
}
