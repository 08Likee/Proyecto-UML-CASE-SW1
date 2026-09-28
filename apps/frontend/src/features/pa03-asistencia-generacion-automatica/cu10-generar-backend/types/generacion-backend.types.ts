export type SeveridadValidacionGeneracion = 'ERROR' | 'ADVERTENCIA';

export interface ProblemaValidacionGeneracion {
  codigo: string;
  severidad: SeveridadValidacionGeneracion;
  elemento: string | null;
  mensaje: string;
}

export interface OperacionPendienteGeneracion {
  clase: string;
  operacion: string;
  firma: string;
  motivo: string;
}

export interface ResultadoValidacionGeneracion {
  valido: boolean;
  errores: ProblemaValidacionGeneracion[];
  advertencias: ProblemaValidacionGeneracion[];
  operacionesPendientes: OperacionPendienteGeneracion[];
}

export interface BackendDescargable {
  blob: Blob;
  nombreArchivo: string;
}
