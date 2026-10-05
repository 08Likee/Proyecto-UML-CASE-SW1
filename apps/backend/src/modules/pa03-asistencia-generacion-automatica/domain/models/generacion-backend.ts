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

export interface ArchivoGenerado {
  ruta: string;
  contenido: string | Buffer;
}

export interface EntidadBackend {
  nombre: string;
  idNombre: string;
  idTipoJava: string;
  atributos: AtributoBackend[];
  relaciones: RelacionBackend[];
}

export interface AtributoBackend {
  nombre: string;
  tipoJava: string;
  identificador: boolean;
}

export type TipoRelacionJpa =
  'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY';

export interface RelacionBackend {
  nombreCampo: string;
  entidadDestino: string;
  idNombreDestino: string;
  idTipoJavaDestino: string;
  tipo: TipoRelacionJpa;
  opcional: boolean;
}

export interface EspecificacionBackend {
  nombreProyecto: string;
  artifactId: string;
  paqueteBase: string;
  entidades: EntidadBackend[];
  operacionesPendientes: OperacionPendienteGeneracion[];
}
