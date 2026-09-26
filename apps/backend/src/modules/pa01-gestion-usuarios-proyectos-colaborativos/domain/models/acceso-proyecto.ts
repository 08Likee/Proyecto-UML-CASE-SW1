import { type PermisoEfectivoParticipante } from './participante';

export interface AccesoProyecto {
  proyecto: {
    id: string;
    nombre: string;
    descripcion: string | null;
    configuracion: Record<string, unknown>;
    estado: string;
  };

  membresia: {
    id: string;
    estado: string;
  };

  rol: {
    id: string;
    nombre: string;
    esPredeterminado: boolean;
  };

  permisos: PermisoEfectivoParticipante[];
}
