import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ProveedorIaPort,
  type RespuestaProveedorIa,
  type SolicitudProveedorIa,
} from '../../application/ports/proveedor-ia.port';
import { ErrorProveedorIa } from './error-proveedor-ia';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO_POR_DEFECTO = 'openai/gpt-oss-20b';
const TIEMPO_ESPERA_POR_DEFECTO_MS = 20_000;
const MAX_MENSAJES = 24;
const MAX_CARACTERES_POR_MENSAJE = 12_000;
const MAX_CARACTERES_TOTALES = 48_000;
const MAX_TOKENS_SALIDA = 2_048;
const MAX_BYTES_RESPUESTA = 262_144;

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function validarSolicitud(solicitud: SolicitudProveedorIa): void {
  if (
    !solicitud ||
    !Array.isArray(solicitud.mensajes) ||
    solicitud.mensajes.length === 0 ||
    solicitud.mensajes.length > MAX_MENSAJES ||
    !solicitud.formato
  ) {
    throw new ErrorProveedorIa('SOLICITUD_INVALIDA');
  }

  let caracteres = 0;
  for (const mensaje of solicitud.mensajes) {
    if (
      !mensaje ||
      !['sistema', 'usuario', 'asistente'].includes(mensaje.rol) ||
      typeof mensaje.contenido !== 'string' ||
      !mensaje.contenido.trim() ||
      mensaje.contenido.length > MAX_CARACTERES_POR_MENSAJE
    ) {
      throw new ErrorProveedorIa('SOLICITUD_INVALIDA');
    }
    caracteres += mensaje.contenido.length;
  }
  if (caracteres > MAX_CARACTERES_TOTALES) {
    throw new ErrorProveedorIa('SOLICITUD_INVALIDA');
  }

  if (
    solicitud.maxTokensSalida !== undefined &&
    (!Number.isInteger(solicitud.maxTokensSalida) ||
      solicitud.maxTokensSalida < 1 ||
      solicitud.maxTokensSalida > MAX_TOKENS_SALIDA)
  ) {
    throw new ErrorProveedorIa('SOLICITUD_INVALIDA');
  }

  if (solicitud.formato.tipo === 'texto') return;

  if (
    solicitud.formato.tipo !== 'json_estructurado' ||
    !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(solicitud.formato.nombreEsquema) ||
    !objeto(solicitud.formato.esquema) ||
    solicitud.formato.esquema.type !== 'object'
  ) {
    throw new ErrorProveedorIa('SOLICITUD_INVALIDA');
  }
}

function tiempoEspera(config: string | undefined): number {
  if (!config) return TIEMPO_ESPERA_POR_DEFECTO_MS;
  const valor = Number(config);
  return Number.isInteger(valor) && valor >= 1_000 && valor <= 60_000
    ? valor
    : TIEMPO_ESPERA_POR_DEFECTO_MS;
}

/**
 * Adaptador de infraestructura sin SDK adicional. No se expone mediante un
 * controlador HTTP: los futuros casos de uso comprobaran autorizacion y
 * construiran el contexto del proyecto antes de invocar este puerto.
 */
@Injectable()
export class GroqProveedorIa extends ProveedorIaPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async generar(
    solicitud: SolicitudProveedorIa,
  ): Promise<RespuestaProveedorIa> {
    validarSolicitud(solicitud);

    const clave = this.config.get<string>('GROQ_API_KEY')?.trim();
    if (!clave) throw new ErrorProveedorIa('NO_CONFIGURADO');

    const modelo =
      this.config.get<string>('GROQ_MODEL')?.trim() || MODELO_POR_DEFECTO;
    const timeoutMs = tiempoEspera(this.config.get<string>('GROQ_TIMEOUT_MS'));

    const cuerpo: Record<string, unknown> = {
      model: modelo,
      stream: false,
      max_completion_tokens: solicitud.maxTokensSalida ?? MAX_TOKENS_SALIDA,
      messages: solicitud.mensajes.map((mensaje) => ({
        role:
          mensaje.rol === 'sistema'
            ? 'system'
            : mensaje.rol === 'usuario'
              ? 'user'
              : 'assistant',
        content: mensaje.contenido,
      })),
    };

    if (solicitud.formato.tipo === 'json_estructurado') {
      cuerpo.response_format = {
        type: 'json_schema',
        json_schema: {
          name: solicitud.formato.nombreEsquema,
          strict: true,
          schema: solicitud.formato.esquema,
        },
      };
    }

    let respuestaHttp: Response;
    try {
      respuestaHttp = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clave}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error: unknown) {
      if (
        objeto(error) &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new ErrorProveedorIa('TIEMPO_AGOTADO');
      }
      throw new ErrorProveedorIa('NO_DISPONIBLE');
    }

    if (!respuestaHttp.ok) {
      if (respuestaHttp.status === 401 || respuestaHttp.status === 403) {
        throw new ErrorProveedorIa('CREDENCIALES_RECHAZADAS');
      }
      if (respuestaHttp.status === 429) {
        throw new ErrorProveedorIa('CUOTA_AGOTADA');
      }
      if (respuestaHttp.status === 400 || respuestaHttp.status === 422) {
        throw new ErrorProveedorIa('SOLICITUD_INVALIDA');
      }
      throw new ErrorProveedorIa('NO_DISPONIBLE');
    }

    try {
      const largoInformado = respuestaHttp.headers.get('content-length');
      if (largoInformado && Number(largoInformado) > MAX_BYTES_RESPUESTA) {
        throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
      }
      const cuerpoRespuesta = await respuestaHttp.text();
      if (Buffer.byteLength(cuerpoRespuesta, 'utf8') > MAX_BYTES_RESPUESTA) {
        throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
      }
      const json: unknown = JSON.parse(cuerpoRespuesta);
      if (!objeto(json) || !Array.isArray(json.choices)) {
        throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
      }
      const primera: unknown = json.choices[0];
      if (!objeto(primera) || !objeto(primera.message)) {
        throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
      }
      if (
        primera.finish_reason !== 'stop' ||
        typeof primera.message.content !== 'string' ||
        !primera.message.content.trim()
      ) {
        throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
      }

      if (solicitud.formato.tipo === 'texto') {
        return { tipo: 'texto', contenido: primera.message.content };
      }
      const contenido: unknown = JSON.parse(primera.message.content);
      if (!objeto(contenido)) {
        throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
      }
      // Solo se parsea el JSON. La validacion de esquema y semantica UML
      // corresponde al caso de uso que invoca el proveedor.
      return { tipo: 'json_estructurado', contenido };
    } catch {
      // Nunca propagar la respuesta original ni detalles del proveedor.
      throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
    }
  }
}
