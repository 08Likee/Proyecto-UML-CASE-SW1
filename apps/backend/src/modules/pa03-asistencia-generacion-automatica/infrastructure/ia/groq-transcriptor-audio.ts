import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscriptorAudioPort, type ArchivoAudioVoz, type TranscripcionVoz } from '../../application/ports/transcriptor-audio.port';
import { validarAudioVoz, validarTextoTranscrito } from '../../domain/services/validar-audio-voz';
import { ErrorProveedorIa } from './error-proveedor-ia';

const URL_TRANSCRIPCION = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODELO_VOZ = 'whisper-large-v3-turbo';
const MAX_BYTES_RESPUESTA = 32_768;
const ESPERA_MS = 45_000;

@Injectable()
export class GroqTranscriptorAudio extends TranscriptorAudioPort {
  constructor(private readonly config: ConfigService) { super(); }

  async transcribir(audio: ArchivoAudioVoz): Promise<TranscripcionVoz> {
    const { mime, extension } = validarAudioVoz(audio);
    const clave = this.config.get<string>('GROQ_API_KEY')?.trim();
    if (!clave) throw new ErrorProveedorIa('NO_CONFIGURADO');

    const form = new FormData();
    // Nombre fijo: el usuario no puede inyectar nombres ni rutas al proveedor.
    form.set('file', new Blob([new Uint8Array(audio.buffer)], { type: mime }), `voz.${extension}`);
    form.set('model', MODELO_VOZ);
    form.set('language', 'es');
    form.set('response_format', 'json');
    form.set('temperature', '0');

    let respuesta: Response;
    try {
      respuesta = await fetch(URL_TRANSCRIPCION, {
        method: 'POST',
        headers: { Authorization: `Bearer ${clave}` },
        body: form,
        signal: AbortSignal.timeout(ESPERA_MS),
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new ErrorProveedorIa('TIEMPO_AGOTADO');
      }
      throw new ErrorProveedorIa('NO_DISPONIBLE');
    }
    if (!respuesta.ok) {
      if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorProveedorIa('CREDENCIALES_RECHAZADAS');
      if (respuesta.status === 429) throw new ErrorProveedorIa('CUOTA_AGOTADA');
      if (respuesta.status === 400 || respuesta.status === 413 || respuesta.status === 422) throw new ErrorProveedorIa('SOLICITUD_INVALIDA');
      throw new ErrorProveedorIa('NO_DISPONIBLE');
    }
    try {
      const declarado = respuesta.headers.get('content-length');
      if (declarado && Number(declarado) > MAX_BYTES_RESPUESTA) throw new Error();
      const contenido = await respuesta.text();
      if (Buffer.byteLength(contenido, 'utf8') > MAX_BYTES_RESPUESTA) throw new Error();
      const json: unknown = JSON.parse(contenido);
      if (!json || typeof json !== 'object' || !('text' in json)) throw new Error();
      // Validar la cadena sin propagar respuestas originales del proveedor.
      return { texto: validarTextoTranscrito(json.text) };
    } catch {
      throw new ErrorProveedorIa('RESPUESTA_INVALIDA');
    }
  }
}
