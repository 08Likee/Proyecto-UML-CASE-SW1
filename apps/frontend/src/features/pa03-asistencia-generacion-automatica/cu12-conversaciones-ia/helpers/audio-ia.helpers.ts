/** Formatos aceptados para dictado de CU-09. El navegador elige según soporte. */
export const MAX_BYTES_AUDIO_IA = 8_000_000;
export const DURACION_MAXIMA_AUDIO_MS = 60_000;
const extensiones: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

export function extensionAudio(mime: string): string | null {
  return extensiones[mime.split(';')[0].trim().toLowerCase()] ?? null;
}

export function elegirMimeGrabacion(soporta: (mime: string) => boolean): string | null {
  const alternativas = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];
  return alternativas.find((tipo) => soporta(tipo)) ?? null;
}

export function verificarAudioGrabado(tipo: string, tamano: number): string {
  const extension = extensionAudio(tipo);
  if (!extension) throw new Error('El formato de audio del navegador no es compatible con la transcripción.');
  if (!Number.isSafeInteger(tamano) || tamano < 1) throw new Error('No se detectó audio. Probá grabar nuevamente.');
  if (tamano > MAX_BYTES_AUDIO_IA) throw new Error('La grabación supera el límite de 8 MB. Grabá un mensaje más corto.');
  return extension;
}
