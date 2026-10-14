import { apiBlobRequest, apiRequest } from "../../../../shared/api/http";
import type {
  ArchivoXmiDescargable,
  ResultadoValidacionExportacionXmi,
} from "../types/exportacion-xmi.types";

export function validarExportacionXmi(
  idProyecto: string,
  idModelo: string,
): Promise<ResultadoValidacionExportacionXmi> {
  return apiRequest<ResultadoValidacionExportacionXmi>(
    `/proyectos/${idProyecto}/modelos-uml/${idModelo}/exportacion-xmi/validacion`,
  );
}

export async function descargarModeloXmi(
  idProyecto: string,
  idModelo: string,
): Promise<ArchivoXmiDescargable> {
  const respuesta = await apiBlobRequest(
    `/proyectos/${idProyecto}/modelos-uml/${idModelo}/exportacion-xmi/archivo`,
  );

  const disposicion = respuesta.headers.get("Content-Disposition") ?? "";
  const coincidencia = /filename="?([^";]+)"?/i.exec(disposicion);

  return {
    blob: respuesta.blob,
    nombreArchivo: coincidencia?.[1] ?? "modelo-uml.xmi",
  };
}
