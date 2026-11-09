import type {
  MultiplicidadUml,
  TipoRelacionUml,
  VisibilidadUml,
} from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types.ts';

export interface ReferenciaClaseAsistente {
  id?: string;
  nombre?: string;
}

export interface ReferenciaAtributoAsistente {
  id?: string;
  nombre?: string;
}

export interface DefinicionAtributoAsistente {
  nombre: string;
  tipo: string;
  visibilidad?: VisibilidadUml;
}

export interface DefinicionParametroAsistente {
  nombre: string;
  tipo: string;
}

export interface DefinicionOperacionAsistente {
  nombre: string;
  visibilidad?: VisibilidadUml;
  parametros?: DefinicionParametroAsistente[];
  tipoRetorno?: string | null;
}

export type AccionAsistente =
  | {
      tipo: 'CREAR_CLASE';
      nombre: string;
      atributos?: DefinicionAtributoAsistente[];
      operaciones?: DefinicionOperacionAsistente[];
      persistente?: boolean;
      atributoIdentificador?: string | null;
    }
  | {
      tipo: 'RENOMBRAR_CLASE';
      clase: ReferenciaClaseAsistente;
      nuevoNombre: string;
    }
  | {
      tipo: 'AGREGAR_ATRIBUTO';
      clase: ReferenciaClaseAsistente;
      atributo: DefinicionAtributoAsistente;
    }
  | {
      tipo: 'MODIFICAR_ATRIBUTO';
      clase: ReferenciaClaseAsistente;
      atributo: ReferenciaAtributoAsistente;
      cambios: Partial<DefinicionAtributoAsistente>;
    }
  | {
      tipo: 'AGREGAR_OPERACION';
      clase: ReferenciaClaseAsistente;
      operacion: DefinicionOperacionAsistente;
    }
  | {
      tipo: 'CREAR_RELACION';
      origen: ReferenciaClaseAsistente;
      destino: ReferenciaClaseAsistente;
      tipoRelacion: TipoRelacionUml;
      nombre?: string | null;
      multiplicidadOrigen?: MultiplicidadUml | null;
      multiplicidadDestino?: MultiplicidadUml | null;
    }
  | {
      tipo: 'CONFIGURAR_PERSISTENCIA';
      clase: ReferenciaClaseAsistente;
      persistente: boolean;
      atributoIdentificador?: ReferenciaAtributoAsistente | null;
    };

export type IntencionAsistente =
  | {
      version: 1;
      estado: 'LISTA';
      acciones: AccionAsistente[];
    }
  | {
      version: 1;
      estado: 'FALTAN_DATOS';
      pregunta: string;
      datosFaltantes: string[];
    }
  | {
      version: 1;
      estado: 'NO_SOPORTADA';
      motivo: string;
    };
