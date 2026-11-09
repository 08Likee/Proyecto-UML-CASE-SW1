import { BadRequestException } from '@nestjs/common';
import type { ArchivoAudioVoz } from '../../application/ports/transcriptor-audio.port';

export const LIMITE_BYTES_AUDIO_VOZ = 8_000_000;
export const LIMITE_CARACTERES_TRANSCRIPCION = 8_000;

const extensiones: Readonly<Record<string, string>> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/m4a': 'm4a',
};

export function validarAudioVoz(archivo: ArchivoAudioVoz | undefined): { mime: string; extension: string } {
  if (!archivo || !Buffer.isBuffer(archivo.buffer) || !Number.isSafeInteger(archivo.size) || archivo.size !== archivo.buffer.length || archivo.size === 0 || archivo.size > LIMITE_BYTES_AUDIO_VOZ) {
    throw new BadRequestException('El audio está vacío o supera el límite de 8 MB.');
  }
  const mime = archivo.mimetype?.split(';')[0]?.trim().toLowerCase() ?? '';
  const extension = extensiones[mime];
  if (!extension) throw new BadRequestException('Formato de audio no admitido.');
  return { mime, extension };
}

export function validarTextoTranscrito(valor: unknown): string {
  if (typeof valor !== 'string') throw new BadRequestException('La transcripción no es válida.');
  const texto = valor.trim();
  if (!texto || texto.length > LIMITE_CARACTERES_TRANSCRIPCION) throw new BadRequestException('La transcripción está vacía o es demasiado larga.');
  return texto;
}
