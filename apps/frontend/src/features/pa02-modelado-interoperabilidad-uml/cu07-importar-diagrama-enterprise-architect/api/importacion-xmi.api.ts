import { apiRequest } from '../../../../shared/api/http';
import type {
  ModeloImportadoXmi,
  ResultadoValidacionImportacionXmi,
} from '../types/importacion-xmi.types';

function formDataArchivo(archivo: File, nombre?: string): FormData {
  const data = new FormData();
  data.append('archivo', archivo, archivo.name);
  if (nombre?.trim()) data.append('nombre', nombre.trim());
  return data;
}

export function validarImportacionXmi(
  idProyecto: string,
  archivo: File,
): Promise<ResultadoValidacionImportacionXmi> {
  return apiRequest<ResultadoValidacionImportacionXmi>(
    `/proyectos/${idProyecto}/modelos-uml/importacion-xmi/validacion`,
    {
      method: 'POST',
      body: formDataArchivo(archivo),
    },
  );
}

export function importarModeloXmi(
  idProyecto: string,
  archivo: File,
  nombre: string,
): Promise<ModeloImportadoXmi> {
  return apiRequest<ModeloImportadoXmi>(
    `/proyectos/${idProyecto}/modelos-uml/importacion-xmi`,
    {
      method: 'POST',
      body: formDataArchivo(archivo, nombre),
    },
  );
}
