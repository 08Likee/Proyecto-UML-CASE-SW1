import { ConfigService } from '@nestjs/config';
import { GroqTranscriptorAudio } from './groq-transcriptor-audio';

const audio = { buffer: Buffer.from('audio'), size: 5, mimetype: 'audio/webm' };

describe('CU09 voz — Groq Whisper Turbo', () => {
  const fetchOriginal = globalThis.fetch;
  const fetchFalso = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const claveOriginal = process.env.GROQ_API_KEY;
  let adaptador: GroqTranscriptorAudio;
  beforeEach(() => {
    fetchFalso.mockReset();
    globalThis.fetch = fetchFalso;
    process.env.GROQ_API_KEY = 'clave-prueba';
    adaptador = new GroqTranscriptorAudio(new ConfigService());
  });
  afterAll(() => {
    globalThis.fetch = fetchOriginal;
    if (claveOriginal === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = claveOriginal;
  });
  it('envía audio efímero sin exponer clave y pide español', async () => {
    fetchFalso.mockResolvedValue(new Response(JSON.stringify({ text: 'Modelo UML' }), { status: 200 }));
    expect(await adaptador.transcribir(audio)).toEqual({ texto: 'Modelo UML' });
    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(opciones?.headers).toMatchObject({ Authorization: 'Bearer clave-prueba' });
    expect(opciones?.body).toBeInstanceOf(FormData);
    const form = opciones!.body as FormData;
    expect(form.get('model')).toBe('whisper-large-v3-turbo');
    expect(form.get('language')).toBe('es');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });
  it('falla de forma controlada cuando no hay clave', async () => {
    delete process.env.GROQ_API_KEY;
    await expect(adaptador.transcribir(audio)).rejects.toMatchObject({ codigo: 'NO_CONFIGURADO' });
    expect(fetchFalso).not.toHaveBeenCalled();
  });
  it('no acepta una transcripción vacía ni una respuesta malformada', async () => {
    fetchFalso.mockResolvedValue(new Response('{"text":"  "}', { status: 200 }));
    await expect(adaptador.transcribir(audio)).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });
  it('traduce límites de cuota sin filtrar respuesta remota', async () => {
    fetchFalso.mockResolvedValue(new Response('datos internos', { status: 429 }));
    await expect(adaptador.transcribir(audio)).rejects.toMatchObject({ codigo: 'CUOTA_AGOTADA' });
  });
});
