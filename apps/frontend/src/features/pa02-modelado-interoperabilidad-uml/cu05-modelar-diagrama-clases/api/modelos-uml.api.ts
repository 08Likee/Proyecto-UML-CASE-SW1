import { apiRequest } from '../../../../shared/api/http';
import type {
  ModeloUml,
  ModeloUmlContenido,
  ModeloUmlResumen,
} from '../types/modelo-uml.types';

export interface ModeloUmlPapelera {
  id: string;
  nombre: string;
  fechaEliminacion: string;
  fechaPurga: string;
  estadoAnterior: string;
}

export function listarModelosUmlPapelera(idProyecto: string): Promise<ModeloUmlPapelera[]> {
  return apiRequest<ModeloUmlPapelera[]>(`/proyectos/${idProyecto}/modelos-uml/papelera`);
}

export function moverModeloUmlPapelera(idProyecto: string, idModelo: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/proyectos/${idProyecto}/modelos-uml/${idModelo}`, { method: 'DELETE' });
}

export function restaurarModeloUmlPapelera(idProyecto: string, idModelo: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/proyectos/${idProyecto}/modelos-uml/${idModelo}/restaurar`, { method: 'POST' });
}

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
