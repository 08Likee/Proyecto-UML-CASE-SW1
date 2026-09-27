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

export interface SnapshotColaborativoModeloUml {
  modelo: ModeloUml;
  estadoYjsBase64: string | null;
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

  abstract buscarSnapshotColaborativoPorIdYProyecto(
    idModelo: string,
    idProyecto: string,
  ): Promise<SnapshotColaborativoModeloUml | null>;

  abstract actualizarSnapshotColaborativo(
    idModelo: string,
    idProyecto: string,
    contenido: ModeloUmlContenido,
    estadoYjsBase64: string,
  ): Promise<ModeloUml | null>;
}
