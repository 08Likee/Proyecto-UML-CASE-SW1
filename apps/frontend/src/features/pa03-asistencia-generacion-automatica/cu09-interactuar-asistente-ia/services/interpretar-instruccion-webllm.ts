import type {
  InitProgressReport,
  MLCEngineInterface,
} from '@mlc-ai/web-llm';
import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types';
import type { IntencionAsistente } from '../types/intencion-asistente.types';
import { validarIntencionAsistente } from './validar-intencion-asistente';
import { corregirTipoDeAtributoExplicito } from './corregir-tipo-atributo-explicito';
import { extraerObjetoJsonWebLlm, PROMPT_SISTEMA_WEBLLM } from './formato-respuesta-webllm';

export const MODELO_WEBLLM_CU09 = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export interface ContextoPendienteAsistente {
  instruccionOriginal: string;
  pregunta: string;
  datosFaltantes: string[];
}

export interface ProgresoCargaIa {
  progreso: number;
  texto: string;
}

type EscuchaProgreso = (progreso: ProgresoCargaIa) => void;

let motor: MLCEngineInterface | null = null;
let cargaMotor: Promise<MLCEngineInterface> | null = null;
let trabajadorActual: Worker | null = null;
// Tras un fallo de carga o pérdida de WebGPU, no reintentar inferencias
// desconocidas automáticamente. El usuario puede preparar IA manualmente.
let requierePreparacionManual = false;
const escuchasProgreso = new Set<EscuchaProgreso>();

function descartarMotor(): void {
  motor = null;
  cargaMotor = null;
  trabajadorActual?.terminate();
  trabajadorActual = null;
}

function esFalloIrrecuperableWebLlm(error: unknown): boolean {
  const mensaje = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';
  return /object has already been disposed|device was lost|gpu.?device.?lost|dxgi_error_device_hung|out of memory|grammar.?matcher|cannot pass deleted object as a pointer/i.test(mensaje);
}

function notificarProgreso(reporte: InitProgressReport): void {
  const progreso = Number.isFinite(reporte.progress)
    ? Math.max(0, Math.min(1, reporte.progress))
    : 0;
  for (const escucha of escuchasProgreso) {
    escucha({ progreso, texto: reporte.text });
  }
}

function asegurarWebGpu(): void {
  if (!('gpu' in navigator)) {
    throw new Error(
      'Este navegador no expone WebGPU. CU-09 necesita un navegador y una GPU compatibles para ejecutar WebLLM localmente.',
    );
  }
}

export function iaLocalCargada(): boolean {
  return motor !== null;
}

export function iaLocalRequierePreparacionManual(): boolean {
  return requierePreparacionManual;
}

export async function cargarIaLocal(
  alProgreso?: EscuchaProgreso,
): Promise<void> {
  if (alProgreso) escuchasProgreso.add(alProgreso);

  try {
    if (motor) {
      alProgreso?.({ progreso: 1, texto: 'Modelo de IA local listo.' });
      return;
    }

    asegurarWebGpu();

    if (!cargaMotor) {
      cargaMotor = (async () => {
        const { WebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
        const worker = new Worker(new URL('../workers/webllm.worker.ts', import.meta.url), {
          type: 'module',
        });
        trabajadorActual = worker;
        const engine = new WebWorkerMLCEngine(worker, {
          initProgressCallback: notificarProgreso,
          logLevel: 'WARN',
        });
        await engine.reload(MODELO_WEBLLM_CU09);
        motor = engine;
        requierePreparacionManual = false;
        return engine;
      })().catch((error: unknown) => {
        requierePreparacionManual = true;
        descartarMotor();
        throw error;
      });
    }

    await cargaMotor;
  } finally {
    if (alProgreso) escuchasProgreso.delete(alProgreso);
  }
}

function resumirModelo(contenido: ModeloUmlContenido, consulta: string): string {
  const textoConsulta = consulta.toLocaleLowerCase('es');
  const clasesMencionadas = new Set(
    contenido.clases
      .filter((clase) =>
        clase.nombre.trim().length > 0 &&
        textoConsulta.includes(clase.nombre.toLocaleLowerCase('es')),
      )
      .map((clase) => clase.id),
  );
  const nombresPorId = new Map(
    contenido.clases.map((clase) => [clase.id, clase.nombre] as const),
  );

  return JSON.stringify({
    // Conserva todos los nombres; detalla solamente las clases mencionadas.
    clases: contenido.clases.map((clase) => ({
      nombre: clase.nombre,
      ...(clasesMencionadas.has(clase.id)
        ? {
            atributos: clase.atributos.map((atributo) => ({
              nombre: atributo.nombre,
              tipo: atributo.tipo,
              visibilidad: atributo.visibilidad,
            })),
            operaciones: clase.operaciones.map((operacion) => ({
              nombre: operacion.nombre,
              visibilidad: operacion.visibilidad,
              parametros: operacion.parametros.map((parametro) => ({
                nombre: parametro.nombre,
                tipo: parametro.tipo,
              })),
              tipoRetorno: operacion.tipoRetorno,
            })),
            persistente: clase.persistencia.persistente,
            atributoIdentificador:
              clase.atributos.find(
                (atributo) =>
                  atributo.id === clase.persistencia.idAtributoIdentificador,
              )?.nombre ?? null,
          }
        : {}),
    })),
    relaciones: contenido.relaciones
      .filter(
        (relacion) =>
          clasesMencionadas.has(relacion.idClaseOrigen) ||
          clasesMencionadas.has(relacion.idClaseDestino),
      )
      .map((relacion) => ({
        tipo: relacion.tipo,
        origen: nombresPorId.get(relacion.idClaseOrigen) ?? relacion.idClaseOrigen,
        destino: nombresPorId.get(relacion.idClaseDestino) ?? relacion.idClaseDestino,
        nombre: relacion.nombre,
        multiplicidadOrigen: relacion.multiplicidadOrigen,
        multiplicidadDestino: relacion.multiplicidadDestino,
      })),
  });
}

function construirMensajeUsuario(
  instruccion: string,
  contenido: ModeloUmlContenido,
  contextoPendiente?: ContextoPendienteAsistente | null,
): string {
  const consulta = [contextoPendiente?.instruccionOriginal, instruccion]
    .filter((parte): parte is string => Boolean(parte))
    .join('\n');
  const partes = [
    `MODELO_ACTUAL=${resumirModelo(contenido, consulta)}`,
  ];

  if (contextoPendiente) {
    partes.push(
      `CONTEXTO_PENDIENTE=${JSON.stringify(contextoPendiente)}`,
      `RESPUESTA_DEL_USUARIO=${JSON.stringify(instruccion.trim())}`,
      'Completa la intención pendiente usando la nueva respuesta. Si aún faltan datos, vuelve a FALTAN_DATOS.',
    );
  } else {
    partes.push(`INSTRUCCION=${JSON.stringify(instruccion.trim())}`);
  }

  return partes.join('\n');
}

export async function interpretarInstruccionWebLlm(
  instruccion: string,
  contenido: ModeloUmlContenido,
  contextoPendiente?: ContextoPendienteAsistente | null,
): Promise<IntencionAsistente> {
  const texto = instruccion.trim();
  if (!texto) {
    throw new Error('Escribe una instrucción antes de enviarla al asistente.');
  }
  const engine = motor;
  if (!engine) {
    throw new Error('El modelo de IA local todavía no está cargado.');
  }

  const respuesta = await (async () => {
    try {
      return await engine.chat.completions.create({
        messages: [
          { role: 'system', content: PROMPT_SISTEMA_WEBLLM },
          {
            role: 'user',
            content: construirMensajeUsuario(texto, contenido, contextoPendiente),
          },
        ],
        temperature: 0.1,
        // Sin response_format: evita invocar el GrammarMatcher de XGrammar.
        max_tokens: 700,
      });
    } catch (error: unknown) {
      if (esFalloIrrecuperableWebLlm(error)) {
        requierePreparacionManual = true;
        if (motor === engine) descartarMotor();
        const mensaje = error instanceof Error ? error.message : String(error);
        const falloGramatica = /grammar.?matcher|cannot pass deleted object as a pointer/i.test(mensaje);
        throw new Error(
          falloGramatica
            ? 'WebLLM encontró un error interno de GrammarMatcher y se descartó el motor. El UML no cambió y las órdenes explícitas siguen disponibles sin GPU. Usá «Preparar IA local» para intentar recuperar la interpretación libre.'
            : 'WebLLM perdió recursos de WebGPU y se descartó el motor. El UML no cambió. Las órdenes explícitas siguen disponibles sin GPU; para volver a usar WebLLM, pulsá «Preparar IA local». Si la GPU no se recupera, puede ser necesario reiniciar Chrome.',
          { cause: error },
        );
      }
      throw error;
    }
  })();

  const contenidoRespuesta = respuesta.choices[0]?.message?.content;
  if (typeof contenidoRespuesta !== 'string' || !contenidoRespuesta.trim()) {
    throw new Error('La IA local no devolvió una intención.');
  }

  let jsonInterpretado: unknown;
  try {
    jsonInterpretado = extraerObjetoJsonWebLlm(contenidoRespuesta);
  } catch (error: unknown) {
    const motivoFin = respuesta.choices[0]?.finish_reason ?? 'desconocido';
    if (import.meta.env.DEV) {
      console.warn('[CU-09] Respuesta de WebLLM no interpretable como JSON', {
        motivoFin,
        longitud: contenidoRespuesta.length,
        comienzo: contenidoRespuesta.slice(0, 1200),
        final: contenidoRespuesta.slice(-300),
      });
    }
    throw new Error(
      `La IA local no devolvió un objeto JSON interpretable (fin: ${motivoFin}).${import.meta.env.DEV ? ' Revisa la consola para ver la salida del modelo.' : ''}`,
      { cause: error },
    );
  }

  // Solo corrige una petición de tipo redundante cuando la instrucción
  // coincide íntegramente con un comando explícito y la clase es inequívoca.
  // La intención resultante pasa por el mismo validador y ejecutor UML.
  const intencionComprobada = corregirTipoDeAtributoExplicito(
    jsonInterpretado,
    texto,
    contenido.clases,
    contextoPendiente !== null && contextoPendiente !== undefined,
  );
  if (intencionComprobada !== jsonInterpretado && import.meta.env.DEV) {
    console.info('[CU-09] Dato de tipo explícito recuperado de la instrucción.');
  }
  const validacion = validarIntencionAsistente(intencionComprobada);
  if (!validacion.valida || !validacion.intencion) {
    throw new Error(
      `La IA produjo una intención que el sistema rechazó: ${validacion.errores.join('; ')}`,
    );
  }

  return validacion.intencion;
}
