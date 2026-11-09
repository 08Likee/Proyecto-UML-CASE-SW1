export type ModeloUmlEstado = 'ACTIVO' | 'ARCHIVADO' | 'ELIMINADO';

export type VisibilidadUml = 'PUBLICA' | 'PRIVADA' | 'PROTEGIDA' | 'PAQUETE';

export type TipoRelacionUml =
  'ASOCIACION' | 'GENERALIZACION' | 'AGREGACION' | 'COMPOSICION';

export type MultiplicidadUml = '1' | '0..1' | '*' | '0..*' | '1..*';

export interface PosicionUml {
  x: number;
  y: number;
}

export interface AtributoUml {
  id: string;
  nombre: string;
  tipo: string;
  visibilidad: VisibilidadUml;
}

export interface ParametroUml {
  id: string;
  nombre: string;
  tipo: string;
}

export interface OperacionUml {
  id: string;
  nombre: string;
  visibilidad: VisibilidadUml;
  parametros: ParametroUml[];
  tipoRetorno: string | null;
}

export interface PersistenciaClaseUml {
  persistente: boolean;
  idAtributoIdentificador: string | null;
}

export interface ClaseUml {
  id: string;
  nombre: string;
  atributos: AtributoUml[];
  operaciones: OperacionUml[];
  posicion: PosicionUml;
  persistencia: PersistenciaClaseUml;
}

export interface RelacionUml {
  id: string;
  tipo: TipoRelacionUml;
  idClaseOrigen: string;
  idClaseDestino: string;
  nombre: string | null;
  multiplicidadOrigen: MultiplicidadUml | null;
  multiplicidadDestino: MultiplicidadUml | null;
}

export interface ModeloUmlContenido {
  versionEsquema: 1;
  clases: ClaseUml[];
  relaciones: RelacionUml[];
  configuracion: Record<string, unknown>;
}

export interface ModeloUml {
  id: string;
  nombre: string;
  descripcion: string | null;
  contenido: ModeloUmlContenido;
  version: number;
  estado: ModeloUmlEstado;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  idProyecto: string;
}

export interface ModeloUmlResumen {
  id: string;
  nombre: string;
  descripcion: string | null;
  version: number;
  estado: ModeloUmlEstado;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  idProyecto: string;
}

export function crearContenidoModeloUmlVacio(): ModeloUmlContenido {
  return {
    versionEsquema: 1,
    clases: [],
    relaciones: [],
    configuracion: {},
  };
}
