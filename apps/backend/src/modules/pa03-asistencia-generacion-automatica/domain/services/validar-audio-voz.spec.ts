import { validarAudioVoz, validarTextoTranscrito, LIMITE_BYTES_AUDIO_VOZ } from './validar-audio-voz';

describe('CU09 voz — validación del audio', () => {
  it('acepta WEBM y normaliza los códecs de MediaRecorder', () => {
    expect(validarAudioVoz({ buffer: Buffer.from('audio'), size: 5, mimetype: 'audio/webm;codecs=opus' })).toEqual({ mime: 'audio/webm', extension: 'webm' });
  });
  it('rechaza el archivo vacío y uno que excede el límite', () => {
    expect(() => validarAudioVoz({ buffer: Buffer.alloc(0), size: 0, mimetype: 'audio/webm' })).toThrow();
    expect(() => validarAudioVoz({ buffer: Buffer.alloc(LIMITE_BYTES_AUDIO_VOZ + 1), size: LIMITE_BYTES_AUDIO_VOZ + 1, mimetype: 'audio/webm' })).toThrow();
  });
  it('rechaza formatos no autorizados y tamaños falsificados', () => {
    expect(() => validarAudioVoz({ buffer: Buffer.from('abc'), size: 3, mimetype: 'application/octet-stream' })).toThrow();
    expect(() => validarAudioVoz({ buffer: Buffer.from('abc'), size: 2, mimetype: 'audio/webm' })).toThrow();
  });
  it('acepta español y rechaza transcripciones vacías o excesivas', () => {
    expect(validarTextoTranscrito('  Añadir clase Cliente  ')).toBe('Añadir clase Cliente');
    expect(() => validarTextoTranscrito('  ')).toThrow();
    expect(() => validarTextoTranscrito('x'.repeat(8001))).toThrow();
  });
});
