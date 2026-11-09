import { ConfigService } from '@nestjs/config';
import type { SolicitudProveedorIa } from '../../application/ports/proveedor-ia.port';
import { ErrorProveedorIa } from './error-proveedor-ia';
import { GroqProveedorIa } from './groq-proveedor-ia';

const solicitudTexto: SolicitudProveedorIa = {
  mensajes: [
    { rol: 'sistema', contenido: 'Responde consultas técnicas.' },
    { rol: 'usuario', contenido: '¿Qué es una clase UML?' },
  ],
  formato: { tipo: 'texto' },
};

const solicitudEstructurada: SolicitudProveedorIa = {
  mensajes: [{ rol: 'usuario', contenido: 'Propón una clase Cliente.' }],
  formato: {
    tipo: 'json_estructurado',
    nombreEsquema: 'propuesta_uml',
    esquema: {
      type: 'object',
      properties: { nombre: { type: 'string' } },
      required: ['nombre'],
      additionalProperties: false,
    },
  },
};

function respuestaGroq(contenido: string, fin = 'stop'): Response {
  return new Response(
    JSON.stringify({
      choices: [{ finish_reason: fin, message: { content: contenido } }],
    }),
    { status: 200 },
  );
}

function obtenerCuerpoJson(opciones?: RequestInit): string {
  const cuerpo = opciones?.body;
  if (typeof cuerpo !== 'string') {
    throw new Error('Se esperaba una solicitud con cuerpo JSON textual.');
  }
  return cuerpo;
}

describe('GroqProveedorIa', () => {
  const fetchReal = globalThis.fetch;
  const claveAnterior = process.env.GROQ_API_KEY;
  const fetchFalso = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();
  let proveedor: GroqProveedorIa;

  beforeEach(() => {
    fetchFalso.mockReset();
    globalThis.fetch = fetchFalso;
    process.env.GROQ_API_KEY = 'clave-simulada-para-pruebas';
    proveedor = new GroqProveedorIa(new ConfigService());
  });

  afterAll(() => {
    globalThis.fetch = fetchReal;
    if (claveAnterior === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = claveAnterior;
  });

  it('usa el endpoint fijo, envía la clave sólo en el servidor y devuelve texto', async () => {
    fetchFalso.mockResolvedValue(respuestaGroq('Una clase define objetos.'));

    const resultado = await proveedor.generar(solicitudTexto);

    expect(resultado).toEqual({
      tipo: 'texto',
      contenido: 'Una clase define objetos.',
    });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(opciones?.headers).toMatchObject({
      Authorization: 'Bearer clave-simulada-para-pruebas',
    });
    const cuerpoTexto = obtenerCuerpoJson(opciones);
    const cuerpo = JSON.parse(cuerpoTexto) as {
      model: string;
      messages: { role: string; content: string }[];
      max_completion_tokens: number;
      response_format?: unknown;
    };
    expect(cuerpo.model).toBe('openai/gpt-oss-20b');
    expect(cuerpo.messages).toEqual([
      { role: 'system', content: 'Responde consultas técnicas.' },
      { role: 'user', content: '¿Qué es una clase UML?' },
    ]);
    expect(cuerpo.max_completion_tokens).toBeLessThanOrEqual(2048);
    expect(cuerpo.response_format).toBeUndefined();
    expect(cuerpoTexto).not.toContain('clave-simulada');
  });

  it('solicita JSON Schema estricto y devuelve datos sin ejecutarlos', async () => {
    fetchFalso.mockResolvedValue(respuestaGroq('{"nombre":"Cliente"}'));

    const resultado = await proveedor.generar(solicitudEstructurada);

    expect(resultado).toEqual({
      tipo: 'json_estructurado',
      contenido: { nombre: 'Cliente' },
    });
    const cuerpo = JSON.parse(
      obtenerCuerpoJson(fetchFalso.mock.calls[0][1]),
    ) as Record<string, unknown>;
    expect(cuerpo.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'propuesta_uml',
        strict: true,
        schema:
          solicitudEstructurada.formato.tipo === 'json_estructurado'
            ? solicitudEstructurada.formato.esquema
            : {},
      },
    });
  });

  it('permite iniciar sin credenciales y falla de forma controlada al invocar', async () => {
    delete process.env.GROQ_API_KEY;
    await expect(proveedor.generar(solicitudTexto)).rejects.toMatchObject({
      codigo: 'NO_CONFIGURADO',
    });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('rechaza entradas demasiado grandes sin contactar al proveedor', async () => {
    await expect(
      proveedor.generar({
        ...solicitudTexto,
        mensajes: [{ rol: 'usuario', contenido: 'x'.repeat(12_001) }],
      }),
    ).rejects.toMatchObject({ codigo: 'SOLICITUD_INVALIDA' });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('rechaza presupuestos de salida que superan el límite configurado', async () => {
    await expect(
      proveedor.generar({ ...solicitudTexto, maxTokensSalida: 40_000 }),
    ).rejects.toMatchObject({ codigo: 'SOLICITUD_INVALIDA' });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'CREDENCIALES_RECHAZADAS'],
    [403, 'CREDENCIALES_RECHAZADAS'],
    [429, 'CUOTA_AGOTADA'],
    [400, 'SOLICITUD_INVALIDA'],
    [500, 'NO_DISPONIBLE'],
  ] as const)(
    'traduce el error HTTP %i sin revelar contenido',
    async (status, codigo) => {
      fetchFalso.mockResolvedValue(
        new Response('datos internos del proveedor', { status }),
      );

      await expect(proveedor.generar(solicitudTexto)).rejects.toMatchObject({
        codigo,
      });
    },
  );

  it('informa tiempo agotado sin incluir detalles de transporte', async () => {
    fetchFalso.mockRejectedValue(new DOMException('privado', 'TimeoutError'));
    await expect(proveedor.generar(solicitudTexto)).rejects.toMatchObject({
      codigo: 'TIEMPO_AGOTADO',
    });
  });

  it('informa indisponibilidad ante un error de red', async () => {
    fetchFalso.mockRejectedValue(new Error('endpoint privado'));
    await expect(proveedor.generar(solicitudTexto)).rejects.toMatchObject({
      codigo: 'NO_DISPONIBLE',
    });
  });

  it('rechaza respuestas sin el contrato de Chat Completions', async () => {
    fetchFalso.mockResolvedValue(new Response('{"choices":[]}'));
    await expect(proveedor.generar(solicitudTexto)).rejects.toMatchObject({
      codigo: 'RESPUESTA_INVALIDA',
    });
  });

  it('rechaza respuestas truncadas en lugar de usar el texto parcial', async () => {
    fetchFalso.mockResolvedValue(respuestaGroq('parcial', 'length'));
    await expect(proveedor.generar(solicitudTexto)).rejects.toMatchObject({
      codigo: 'RESPUESTA_INVALIDA',
    });
  });

  it('rechaza JSON estructurado mal formado', async () => {
    fetchFalso.mockResolvedValue(respuestaGroq('texto libre'));
    await expect(
      proveedor.generar(solicitudEstructurada),
    ).rejects.toMatchObject({
      codigo: 'RESPUESTA_INVALIDA',
    });
  });

  it('rechaza respuesta excesiva incluso si declara tamaño pequeño', async () => {
    fetchFalso.mockResolvedValue(respuestaGroq('x'.repeat(263_000)));
    await expect(proveedor.generar(solicitudTexto)).rejects.toMatchObject({
      codigo: 'RESPUESTA_INVALIDA',
    });
  });

  it('no adjunta errores ni credenciales del servicio en errores controlados', () => {
    const error = new ErrorProveedorIa('CREDENCIALES_RECHAZADAS');
    expect(error.message).not.toContain('clave-simulada');
    expect(error.message).not.toContain('datos internos');
  });
});
