export type SeveridadValidacionExportacionXmi = "ERROR" | "ADVERTENCIA";

export interface ProblemaValidacionExportacionXmi {
  codigo: string;
  severidad: SeveridadValidacionExportacionXmi;
  elemento: string | null;
  mensaje: string;
}

export interface ResultadoValidacionExportacionXmi {
  valido: boolean;
  errores: ProblemaValidacionExportacionXmi[];
  advertencias: ProblemaValidacionExportacionXmi[];
  formato: "Compatible con Enterprise Architect (UML 2.5 / XMI 2.5.1)";
  resumen: {
    clases: number;
    atributos: number;
    operaciones: number;
    relaciones: number;
  };
}

export interface ArchivoXmiDescargable {
  blob: Blob;
  nombreArchivo: string;
}
