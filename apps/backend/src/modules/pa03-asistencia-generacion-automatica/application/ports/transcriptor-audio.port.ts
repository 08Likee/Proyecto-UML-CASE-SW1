/** El audio de voz es efímero: no se almacena en el historial ni en PostgreSQL. */
export interface ArchivoAudioVoz {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface TranscripcionVoz {
  texto: string;
}

export abstract class TranscriptorAudioPort {
  abstract transcribir(audio: ArchivoAudioVoz): Promise<TranscripcionVoz>;
}
