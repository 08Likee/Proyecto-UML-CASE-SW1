import { Cu09TranscribirVozService } from './cu09-transcribir-voz.service';
import { Cu12ConversacionesIaService } from './cu12-conversaciones-ia.service';
import { ErrorProveedorIa } from '../../infrastructure/ia/error-proveedor-ia';
import { TranscriptorAudioPort } from '../ports/transcriptor-audio.port';

const audio = { buffer: Buffer.from('audio de prueba'), size: 15, mimetype: 'audio/webm' };

describe('CU09 voz — autorización y revisión humana', () => {
  const obtener = jest.fn();
  const transcribir = jest.fn();
  const servicio = new Cu09TranscribirVozService(
    { obtener } as unknown as Cu12ConversacionesIaService,
    { transcribir } as unknown as TranscriptorAudioPort,
  );
  beforeEach(() => { obtener.mockReset(); transcribir.mockReset(); });

  it('valida acceso antes y después de GroqCloud; solo devuelve texto', async () => {
    obtener.mockResolvedValue({ estado: 'ACTIVA' });
    transcribir.mockResolvedValue({ texto: ' Crear una clase Venta ' });
    const resultado = await servicio.transcribir('u1', 'p1', 'c1', audio);
    expect(resultado).toEqual({ texto: 'Crear una clase Venta' });
    expect(obtener).toHaveBeenNthCalledWith(1, 'u1', 'p1', 'c1');
    expect(obtener).toHaveBeenCalledTimes(2);
    expect(transcribir).toHaveBeenCalledTimes(1);
  });
  it('nunca llama al proveedor cuando faltan permisos', async () => {
    obtener.mockRejectedValue(new Error('403'));
    await expect(servicio.transcribir('u', 'p', 'c', audio)).rejects.toThrow();
    expect(transcribir).not.toHaveBeenCalled();
  });
  it('rechaza conversaciones archivadas', async () => {
    obtener.mockResolvedValue({ estado: 'ARCHIVADA' });
    await expect(servicio.transcribir('u', 'p', 'c', audio)).rejects.toThrow();
    expect(transcribir).not.toHaveBeenCalled();
  });
  it('no entrega texto si se revoca la membresía durante la transcripción', async () => {
    obtener.mockResolvedValueOnce({ estado: 'ACTIVA' }).mockRejectedValueOnce(new Error('403'));
    transcribir.mockResolvedValue({ texto: 'Instrucción' });
    await expect(servicio.transcribir('u', 'p', 'c', audio)).rejects.toThrow();
    expect(obtener).toHaveBeenCalledTimes(2);
  });
  it('convierte el límite de GroqCloud en un HTTP 429, sin revelar secretos', async () => {
    obtener.mockResolvedValue({ estado: 'ACTIVA' });
    transcribir.mockRejectedValue(new ErrorProveedorIa('CUOTA_AGOTADA'));
    await expect(servicio.transcribir('u', 'p', 'c', audio)).rejects.toMatchObject({ status: 429 });
  });
  it('no llama al proveedor si el audio es inválido', async () => {
    await expect(servicio.transcribir('u', 'p', 'c', { ...audio, mimetype: 'text/plain' })).rejects.toThrow();
    expect(obtener).not.toHaveBeenCalled();
    expect(transcribir).not.toHaveBeenCalled();
  });
});
