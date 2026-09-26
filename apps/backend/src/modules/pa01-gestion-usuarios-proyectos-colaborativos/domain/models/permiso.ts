export type PermisoEstado = 'ACTIVO' | 'INACTIVO';

export interface Permiso {
  id: string;
  nombre: string;
  descripcion: string | null;
  recurso: string;
  accion: string;
  estado: PermisoEstado;
}

export const PERMISOS = {
  PROYECTO: {
    CONSULTAR: {
      recurso: 'PROYECTO',
      accion: 'CONSULTAR',
    },
    MODIFICAR: {
      recurso: 'PROYECTO',
      accion: 'MODIFICAR',
    },
  },

  PARTICIPANTE: {
    CONSULTAR: {
      recurso: 'PARTICIPANTE',
      accion: 'CONSULTAR',
    },
    INVITAR: {
      recurso: 'PARTICIPANTE',
      accion: 'INVITAR',
    },
    CAMBIAR_ROL: {
      recurso: 'PARTICIPANTE',
      accion: 'CAMBIAR_ROL',
    },
    RETIRAR: {
      recurso: 'PARTICIPANTE',
      accion: 'RETIRAR',
    },
    ASIGNAR_PERMISO: {
      recurso: 'PARTICIPANTE',
      accion: 'ASIGNAR_PERMISO',
    },
  },

  ROL: {
    CONSULTAR: {
      recurso: 'ROL',
      accion: 'CONSULTAR',
    },
    CREAR: {
      recurso: 'ROL',
      accion: 'CREAR',
    },
  },
} as const;
