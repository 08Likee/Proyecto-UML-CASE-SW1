import { apiRequest } from '../../../../shared/api/http';

export interface AccesoColaboracion {
  idUsuario: string;
  idProyecto: string;
  idModelo: string;
  puedeConsultar: true;
  puedeEditar: boolean;
  version: number;
}

export function obtenerAccesoColaboracion(
  idProyecto: string,
  idModelo: string,
): Promise<AccesoColaboracion> {
  return apiRequest<AccesoColaboracion>(
    `/proyectos/${idProyecto}/modelos-uml/${idModelo}/colaboracion/acceso`,
  );
}
