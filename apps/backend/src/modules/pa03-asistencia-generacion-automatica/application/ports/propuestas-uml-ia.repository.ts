import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import type { CambiosPropuestosUml, PropuestaUmlIa } from '../../domain/models/propuesta-uml-ia';

export interface CrearPropuestaUmlEntrada {
  idUsuario: string;
  idProyecto: string;
  idModelo: string;
  idConversacion: string;
  idMensajeUsuario: string;
  versionModelo: number;
  datos: CambiosPropuestosUml;
}

export interface ResultadoAplicacionUmlIa {
  propuesta: PropuestaUmlIa;
  modelo: { id: string; version: number; contenido: ModeloUmlContenido };
  /** Estado Yjs firmado por la autorización del backend: incorporar al CRDT del editor. */
  estadoYjsBase64: string;
}

export abstract class PropuestasUmlIaRepository {
  abstract crear(entrada: CrearPropuestaUmlEntrada): Promise<PropuestaUmlIa | null>;
  abstract listar(idUsuario: string, idProyecto: string, idModelo: string, idConversacion: string): Promise<PropuestaUmlIa[]>;
  abstract aplicar(idUsuario: string, idProyecto: string, idModelo: string, idConversacion: string, idPropuesta: string): Promise<ResultadoAplicacionUmlIa | null>;
  abstract rechazar(idUsuario: string, idProyecto: string, idModelo: string, idConversacion: string, idPropuesta: string): Promise<PropuestaUmlIa | null>;
}
