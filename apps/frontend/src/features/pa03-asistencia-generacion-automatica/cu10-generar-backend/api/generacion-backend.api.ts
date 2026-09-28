import {
  apiBlobRequest,
  apiRequest,
} from '../../../../shared/api/http';
import type {
  BackendDescargable,
  ResultadoValidacionGeneracion,
} from '../types/generacion-backend.types';

export function validarGeneracionBackend(
  idProyecto: string,
  idModelo: string,
): Promise<ResultadoValidacionGeneracion> {
  return apiRequest<ResultadoValidacionGeneracion>(
    `/proyectos/${idProyecto}/modelos-uml/${idModelo}/generacion/validacion`,
  );
}

export async function descargarBackendGenerado(
  idProyecto: string,
  idModelo: string,
): Promise<BackendDescargable> {
  const respuesta = await apiBlobRequest(
    `/proyectos/${idProyecto}/modelos-uml/${idModelo}/generacion/backend`,
    { method: 'POST' },
  );

  const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
  const coincidencia = /filename="?([^";]+)"?/i.exec(disposicion);

  return {
    blob: respuesta.blob,
    nombreArchivo: coincidencia?.[1] ?? 'backend-generado.zip',
  };
}
