import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types';

/**
 * Bloque 11.3: constancia informativa de una orden proveniente de CU-12.
 * El servidor identifica al autor por la sesión y a la conversación por la
 * ruta autenticada. Este mensaje no equivale a una auditoría transaccional.
 */
export type EstadoRegistroOrdenUml = 'APLICADA' | 'NO_EJECUTADA' | 'FALTAN_DATOS';

export interface ResultadoOrdenUmlParaRegistro {
  estado: EstadoRegistroOrdenUml;
  ordenProcesada: string;
  detalle: string;
  versionAnterior: number;
  contenidoAplicado?: ModeloUmlContenido;
}

export interface RegistroOrdenUml extends ResultadoOrdenUmlParaRegistro {
  ordenOriginal: string;
  idModelo: string;
  nombreModelo: string;
  versionConfirmada?: number;
}

const LIMITE_MENSAJE = 8000;

function limpiarTexto(valor: string): string {
  return Array.from(valor, (caracter) => {
    const codigo = caracter.charCodeAt(0);
    return (codigo < 32 && codigo !== 9 && codigo !== 10 && codigo !== 13) || codigo === 127
      ? ' '
      : caracter;
  }).join('').trim();
}

function resumir(valor: string, maximo: number): string {
  const texto = limpiarTexto(valor);
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 16)} … [recortado]`;
}

export function prepararMensajeRegistroOrdenUml(registro: RegistroOrdenUml): string {
  if (!registro.ordenOriginal.trim() || !registro.ordenProcesada.trim() ||
      !registro.idModelo.trim() || !registro.nombreModelo.trim()) {
    throw new Error('El registro CU-09 debe identificar la orden y el modelo.');
  }
  if (registro.estado === 'APLICADA' &&
      (!Number.isInteger(registro.versionConfirmada) ||
        (registro.versionConfirmada ?? 0) <= registro.versionAnterior)) {
    throw new Error('No se puede registrar una aplicación UML sin versión persistida confirmada.');
  }
  const situacion = registro.estado === 'APLICADA'
    ? `APLICADA, persistencia comprobada en v${registro.versionConfirmada}`
    : registro.estado === 'FALTAN_DATOS'
      ? 'PENDIENTE DE DATOS, no ejecutada'
      : 'NO EJECUTADA';
  const partes = [
    '[CU09 · REGISTRO INFORMATIVO DE ORDEN UML]',
    `Resultado: ${situacion}.`,
    `Modelo: ${resumir(registro.nombreModelo, 120)} (${resumir(registro.idModelo, 80)}).`,
    `Versión observada antes del intento: v${registro.versionAnterior}.`,
    `Orden recibida de la conversación: ${resumir(registro.ordenOriginal, 3050)}`,
    `Texto procesado en el asistente: ${resumir(registro.ordenProcesada, 3050)}`,
    `Detalle: ${resumir(registro.detalle, 550)}`,
    'Constancia publicada por el participante; no es una propuesta CU-13 ni una auditoría transaccional.',
  ];
  const mensaje = partes.join('\n');
  if (mensaje.length > LIMITE_MENSAJE) throw new Error('El registro excede el límite de la conversación.');
  return mensaje;
}

// JSONB puede reordenar las claves al persistir el modelo; la comparación
// estructural ignora ese orden y cualquier metadato interno de colaboración.
function normalizar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .filter(([clave]) => clave !== '__colaboracion')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([clave, dato]) => [clave, normalizar(dato)]),
    );
  }
  return valor;
}

export function coincideContenidoPersistido(
  esperado: ModeloUmlContenido,
  recibido: ModeloUmlContenido,
): boolean {
  return JSON.stringify(normalizar(esperado)) === JSON.stringify(normalizar(recibido));
}

/** Sólo se declara APLICADA si la versión y el contenido están en el servidor. */
export async function verificarPersistenciaOrdenUml(
  esperado: ModeloUmlContenido,
  versionAnterior: number,
  prepararSincronizacion: () => Promise<unknown>,
  obtenerServidor: () => Promise<{ version: number; contenido: ModeloUmlContenido }>,
  esperar: (milisegundos: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<number | null> {
  await prepararSincronizacion();
  for (let intento = 0; intento < 3; intento += 1) {
    const servidor = await obtenerServidor();
    if (servidor.version > versionAnterior &&
        coincideContenidoPersistido(esperado, servidor.contenido)) {
      return servidor.version;
    }
    if (intento < 2) await esperar(600);
  }
  return null;
}
