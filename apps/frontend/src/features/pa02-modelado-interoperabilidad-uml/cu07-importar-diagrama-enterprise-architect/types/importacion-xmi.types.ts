import type { ModeloUml } from '../../cu05-modelar-diagrama-clases/types/modelo-uml.types';

export type SeveridadProblemaImportacionXmi = 'ERROR' | 'ADVERTENCIA';

export interface ProblemaImportacionXmi {
  codigo: string;
  severidad: SeveridadProblemaImportacionXmi;
  elemento: string | null;
  mensaje: string;
}

export interface ResultadoValidacionImportacionXmi {
  valido: boolean;
  errores: ProblemaImportacionXmi[];
  advertencias: ProblemaImportacionXmi[];
  formato: string;
  nombreSugerido: string;
  resumen: {
    clases: number;
    atributos: number;
    operaciones: number;
    relaciones: number;
  };
}

export type ModeloImportadoXmi = ModeloUml;
