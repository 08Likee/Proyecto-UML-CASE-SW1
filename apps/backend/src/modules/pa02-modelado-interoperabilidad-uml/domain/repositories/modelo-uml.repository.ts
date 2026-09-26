import {
  type ModeloUml,
  type ModeloUmlContenido,
  type ModeloUmlResumen,
} from '../models/modelo-uml';

export interface CrearModeloUmlDatos {
  idProyecto: string;
  nombre: string;
  descripcion: string | null;
  contenido: ModeloUmlContenido;
}

export interface ActualizarModeloUmlDatos {
  nombre: string;
  descripcion: string | null;
  contenido: ModeloUmlContenido;
  versionEsperada: number;
}

export type ActualizarModeloUmlResultado =
  | {
      tipo: 'ACTUALIZADO';
      modelo: ModeloUml;
    }
  | {
      tipo: 'NO_ENCONTRADO';
    }
  | {
      tipo: 'VERSION_CONFLICTIVA';
    };

export abstract class ModeloUmlRepository {
  abstract crear(datos: CrearModeloUmlDatos): Promise<ModeloUml>;

  abstract listarActivosPorProyecto(
    idProyecto: string,
  ): Promise<ModeloUmlResumen[]>;

  abstract buscarActivoPorIdYProyecto(
    idModelo: string,
    idProyecto: string,
  ): Promise<ModeloUml | null>;

  abstract actualizarSiVersionCoincide(
    idModelo: string,
    idProyecto: string,
    datos: ActualizarModeloUmlDatos,
  ): Promise<ActualizarModeloUmlResultado>;
}
