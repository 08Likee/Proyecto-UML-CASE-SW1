/** CU-11: pistas visuales locales; no activan los controles ni alteran permisos. */
import type { PasoGuia } from './guias-aprendizaje';
import type { PosicionAprendizaje } from './estado-aprendizaje';

export interface ControlVisual {
  id: string;
  titulo: string;
  explicacion: string;
}

const DESCRIPCIONES: Record<string, readonly [string, string]> = {
  'selector-proyecto': ['Elegir proyecto', 'Elegí el proyecto autorizado donde vas a trabajar.'],
  'abrir-modelo': ['Abrir modelo', 'Accedé al diagramador desde la tarjeta del modelo.'],
  'crear-clase': ['Agregar clase', 'Crea una clase únicamente al presionarlo con permiso de edición.'],
  inspector: ['Propiedades', 'Consultá o editá los atributos y las relaciones según tus permisos.'],
  'lienzo-uml': ['Diagrama UML', 'Aquí se representan las clases y sus asociaciones.'],
  'abrir-conversaciones': ['Conversaciones', 'Abrí el historial compartido del proyecto.'],
  'crear-conversacion': ['Conversaciones', 'Creá una conversación o seleccioná una existente.'],
  'editor-conversacion': ['Escribir mensaje', 'El texto se revisa antes de enviarse.'],
  'enviar-equipo': ['Enviar al equipo', 'Comparte el mensaje con los miembros autorizados.'],
  'consultar-ia': ['Consultar IA', 'Solicita una respuesta del asistente, sin editar el modelo.'],
  'analizar-uml': ['Analizar modelo', 'Consulta con IA la versión persistida del UML.'],
  'proponer-uml': ['Proponer cambios', 'Genera una propuesta; no aplica cambios automáticamente.'],
  'ver-propuestas': ['Revisar propuestas', 'Consultá las propuestas y su estado actual.'],
  'generar-backend': ['Generar backend', 'Requiere el permiso GENERACION / GENERAR.'],
  'importar-xmi': ['Importar XMI', 'Requiere el permiso MODELO / IMPORTAR.'],
  'exportar-xmi': ['Exportar XMI', 'Requiere el permiso MODELO / EXPORTAR.'],
};

export function controlesVisualesDePaso(paso: PasoGuia): ControlVisual[] {
  const ids = [paso.control, ...(paso.controlesAdicionales ?? [])].filter((id): id is string => Boolean(id));
  return [...new Set(ids)].map((id) => ({
    id,
    titulo: DESCRIPCIONES[id]?.[0] ?? 'Control de la herramienta',
    explicacion: DESCRIPCIONES[id]?.[1] ?? 'Revisá la indicación de la guía antes de usarlo.',
  }));
}

export interface DimensionesAprendizaje { width: number; height: number }

/** Mantiene el panel visible aun al soltarlo junto al borde de la ventana. */
export function limitarPosicionPanel(
  posicion: PosicionAprendizaje,
  panel: DimensionesAprendizaje,
  pantalla: DimensionesAprendizaje,
  margen = 8,
): PosicionAprendizaje {
  const maxX = Math.max(margen, pantalla.width - panel.width - margen);
  const maxY = Math.max(margen, pantalla.height - panel.height - margen);
  return {
    x: Math.min(maxX, Math.max(margen, Number.isFinite(posicion.x) ? posicion.x : margen)),
    y: Math.min(maxY, Math.max(margen, Number.isFinite(posicion.y) ? posicion.y : margen)),
  };
}

/** Duración máxima de cualquier señalización, inicial o reactivada manualmente. */
export const DURACION_SENALES_CU11_MS = 5000;

/** Oculta las marcas al usar la herramienta; la interacción con la guía es libre.
 * Escape siempre las cierra, incluso si el foco está dentro del panel.
 */
export function debeOcultarSenalesPorInteraccion(
  tipoEvento: string,
  dentroDelPanel: boolean,
  tecla?: string,
): boolean {
  if (tipoEvento === 'keydown' && tecla === 'Escape') return true;
  return !dentroDelPanel && (
    tipoEvento === 'pointerdown' || tipoEvento === 'keydown' || tipoEvento === 'input'
  );
}

/** La primera visita a un paso se identifica por la guía y su índice. */
export function claveSenalizacionInicial(idGuia: string | null, indicePaso: number): string {
  return `${idGuia ?? ''}:${indicePaso}`;
}

/** Una guía bloqueada nunca señala controles aunque existan en el DOM. */
export function puedeSenalizarPorPrimeraVez(
  paso: PasoGuia | undefined,
  condicionFaltante: string | null,
  yaSenalado: boolean,
): boolean {
  return Boolean(paso?.control && !condicionFaltante && !yaSenalado);
}

export interface RectanguloAprendizaje {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function seSuperponenRectangulos(a: RectanguloAprendizaje, b: RectanguloAprendizaje, margen = 0): boolean {
  return a.x < b.x + b.width + margen
    && a.x + a.width + margen > b.x
    && a.y < b.y + b.height + margen
    && a.y + a.height + margen > b.y;
}

export interface UbicacionEtiqueta {
  x: number;
  y: number;
  lado: 'arriba' | 'abajo' | 'izquierda' | 'derecha';
  width: number;
  height: number;
}

/** Evita superponer etiquetas al panel, al control y a etiquetas anteriores. */
export function ubicarEtiquetaAprendizaje(
  objetivo: RectanguloAprendizaje,
  pantalla: DimensionesAprendizaje,
  obstaculos: readonly RectanguloAprendizaje[],
  ancho = 155,
): UbicacionEtiqueta | null {
  const width = Math.max(82, Math.min(172, ancho));
  const height = 30;
  const margen = 8;
  const mitad = objetivo.y + objetivo.height / 2 - height / 2;
  const opciones: UbicacionEtiqueta[] = [
    { x: objetivo.x, y: objetivo.y - height - 10, lado: 'arriba', width, height },
    { x: objetivo.x, y: objetivo.y + objetivo.height + 10, lado: 'abajo', width, height },
    { x: objetivo.x - width - 12, y: mitad, lado: 'izquierda', width, height },
    { x: objetivo.x + objetivo.width + 12, y: mitad, lado: 'derecha', width, height },
  ];
  for (const posicion of opciones) {
    if (posicion.x < margen || posicion.y < margen
      || posicion.x + width > pantalla.width - margen
      || posicion.y + height > pantalla.height - margen) continue;
    if (seSuperponenRectangulos(posicion, objetivo, 3)) continue;
    if (obstaculos.some((otro) => seSuperponenRectangulos(posicion, otro, 3))) continue;
    return posicion;
  }
  return null;
}
