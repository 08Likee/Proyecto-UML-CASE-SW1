/**
 * Contrato interno del proveedor de IA. La capa de aplicacion debe construir
 * previamente un contexto autorizado; el proveedor no consulta proyectos,
 * conversaciones ni modelos UML y nunca ejecuta modificaciones.
 */
export type RolMensajeIa = 'sistema' | 'usuario' | 'asistente';

export interface MensajeIa {
  rol: RolMensajeIa;
  contenido: string;
}

export type FormatoRespuestaIa =
  | { tipo: 'texto' }
  | {
      tipo: 'json_estructurado';
      nombreEsquema: string;
      esquema: Record<string, unknown>;
    };

export interface SolicitudProveedorIa {
  mensajes: readonly MensajeIa[];
  formato: FormatoRespuestaIa;
  maxTokensSalida?: number;
}

export type RespuestaProveedorIa =
  | { tipo: 'texto'; contenido: string }
  | { tipo: 'json_estructurado'; contenido: unknown };

export abstract class ProveedorIaPort {
  abstract generar(
    solicitud: SolicitudProveedorIa,
  ): Promise<RespuestaProveedorIa>;
}
