import type { ModeloUmlContenido } from './modelo-uml';

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

export interface AnalisisImportacionXmi {
  validacion: ResultadoValidacionImportacionXmi;
  contenido: ModeloUmlContenido | null;
}
