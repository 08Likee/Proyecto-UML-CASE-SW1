export type RolEstado = 'ACTIVO' | 'INACTIVO';

export const ROL_ANFITRION = 'Anfitrión';
export const ROL_EDITOR = 'Editor';
export const ROL_ESPECTADOR = 'Espectador';

export interface PermisoRolPredeterminado {
  recurso: string;
  accion: string;
}

export const PERMISOS_ROL_EDITOR: readonly PermisoRolPredeterminado[] = [
  { recurso: 'PROYECTO', accion: 'CONSULTAR' },
  { recurso: 'PARTICIPANTE', accion: 'CONSULTAR' },
  { recurso: 'ROL', accion: 'CONSULTAR' },
  { recurso: 'MODELO', accion: 'CONSULTAR' },
  { recurso: 'MODELO', accion: 'EDITAR' },
];

export const PERMISOS_ROL_ESPECTADOR: readonly PermisoRolPredeterminado[] = [
  { recurso: 'PROYECTO', accion: 'CONSULTAR' },
  { recurso: 'PARTICIPANTE', accion: 'CONSULTAR' },
  { recurso: 'ROL', accion: 'CONSULTAR' },
  { recurso: 'MODELO', accion: 'CONSULTAR' },
];

export function rolPredeterminadoIncluyePermiso(
  nombreRol: string,
  recurso: string,
  accion: string,
): boolean {
  if (nombreRol === ROL_ANFITRION) {
    return true;
  }

  const permisos =
    nombreRol === ROL_EDITOR
      ? PERMISOS_ROL_EDITOR
      : nombreRol === ROL_ESPECTADOR
        ? PERMISOS_ROL_ESPECTADOR
        : [];

  return permisos.some(
    (permiso) => permiso.recurso === recurso && permiso.accion === accion,
  );
}

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
