import type { MultiplicidadUml, TipoRelacionUml, VisibilidadUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';

/** Borrador validado, nunca un comando ejecutable. Sin identificadores ni posiciones del modelo. */
export interface AtributoPropuestoUml {
  nombre: string;
  tipo: string;
  visibilidad: VisibilidadUml;
}

export interface CambiosPropuestosUml {
  resumen: string;
  clasesNuevas: Array<{ nombre: string; atributos: AtributoPropuestoUml[] }>;
  atributosEnClasesExistentes: Array<{ clase: string; atributos: AtributoPropuestoUml[] }>;
  relacionesNuevas: Array<{
    tipo: TipoRelacionUml;
    claseOrigen: string;
    claseDestino: string;
    nombre: string | null;
    multiplicidadOrigen: MultiplicidadUml | null;
    multiplicidadDestino: MultiplicidadUml | null;
  }>;
}

export interface PropuestaUmlIa {
  id: string;
  idProyecto: string;
  idModelo: string;
  idConversacion: string;
  idCreador: string;
  idMensajeUsuario: string;
  versionModelo: number;
  versionActual: number;
  vigente: boolean;
  estado: 'PENDIENTE' | 'RECHAZADA' | 'APLICADA';
  datos: CambiosPropuestosUml;
  fechaCreacion: Date;
}
