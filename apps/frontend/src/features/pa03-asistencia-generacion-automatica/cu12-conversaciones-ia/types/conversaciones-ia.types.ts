export interface ConversacionIa {
  id: string;
  titulo: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  estado: 'ACTIVA' | 'ARCHIVADA' | 'ELIMINADA';
  estadoAnterior?: 'ACTIVA' | 'ARCHIVADA' | null;
  fechaEliminacion?: string | null;
  fechaPurga?: string | null;
  idProyecto: string;
  idCreador: string;
}

export interface MensajeIa {
  id: string;
  contenido: string;
  tipoEmisor: 'USUARIO' | 'IA';
  fechaCreacion: string;
  identificadorSolicitud: string;
  idConversacion: string;
  idUsuario: string | null;
}

export interface ResultadoConsultaIa {
  mensajeUsuario: MensajeIa;
  mensajeIa: MensajeIa;
  modoRespuesta: 'GROQ' | 'RESPALDO';
  fuentesConsultadas?: Array<{ id: string; titulo: string }>;
}

// CU-13 sólo analiza el modelo persistido. No modifica el diagrama.
export interface ResultadoAnalisisModeloIa extends ResultadoConsultaIa {
  modeloAnalizado: { id: string; nombre: string; version: number };
}

// CU-13: cambios revisables, aplicables únicamente tras confirmación y autorización.
export interface CambiosPropuestosUml {
  resumen: string;
  clasesNuevas: Array<{ nombre: string; atributos: Array<{ nombre: string; tipo: string; visibilidad: string }> }>;
  atributosEnClasesExistentes: Array<{ clase: string; atributos: Array<{ nombre: string; tipo: string; visibilidad: string }> }>;
  relacionesNuevas: Array<{ tipo: string; claseOrigen: string; claseDestino: string; nombre: string | null; multiplicidadOrigen: string | null; multiplicidadDestino: string | null }>;
}
export interface PropuestaUmlIa {
  id: string;
  idModelo: string;
  idConversacion: string;
  versionModelo: number;
  versionActual: number;
  vigente: boolean;
  estado: 'PENDIENTE' | 'RECHAZADA' | 'APLICADA';
  datos: CambiosPropuestosUml;
  fechaCreacion: string;
}
export interface ResultadoGenerarPropuestaUmlIa extends ResultadoConsultaIa {
  propuesta: PropuestaUmlIa | null;
  modeloAnalizado: { id: string; nombre: string; version: number };
}

export interface ResultadoAplicacionUmlIa {
  propuesta: PropuestaUmlIa;
  modelo: { id: string; version: number };
  estadoYjsBase64: string;
}
