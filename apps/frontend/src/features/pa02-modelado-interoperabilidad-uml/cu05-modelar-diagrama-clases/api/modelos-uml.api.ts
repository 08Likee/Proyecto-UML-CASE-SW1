import { apiRequest } from '../../../../shared/api/http';
import type {
  ModeloUml,
  ModeloUmlContenido,
  ModeloUmlResumen,
} from '../types/modelo-uml.types';

export function listarModelosUml(
  idProyecto: string,
): Promise<ModeloUmlResumen[]> {
  return apiRequest<ModeloUmlResumen[]>(
    `/proyectos/${idProyecto}/modelos-uml`,
  );
}

export function obtenerModeloUml(
  idProyecto: string,
  idModelo: string,
): Promise<ModeloUml> {
  return apiRequest<ModeloUml>(
    `/proyectos/${idProyecto}/modelos-uml/${idModelo}`,
  );
}

export function crearModeloUml(
  idProyecto: string,
  entrada: { nombre: string; descripcion?: string | null },
): Promise<ModeloUml> {
  return apiRequest<ModeloUml>(`/proyectos/${idProyecto}/modelos-uml`, {
    method: 'POST',
    body: JSON.stringify(entrada),
  });
}

export function guardarModeloUml(
  idProyecto: string,
  idModelo: string,
  entrada: {
    nombre: string;
    descripcion?: string | null;
    contenido: ModeloUmlContenido;
    version: number;
  },
): Promise<ModeloUml> {
  return apiRequest<ModeloUml>(
    `/proyectos/${idProyecto}/modelos-uml/${idModelo}`,
    {
      method: 'PUT',
      body: JSON.stringify(entrada),
    },
  );
}
