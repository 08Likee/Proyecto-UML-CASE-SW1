// RF-46: la selección de contexto se hace solo a petición expresa y nunca incluye el chat actual.
export const MAX_FUENTES_CONTEXTO = 3;

export function actualizarFuentesContexto(
  seleccionActual: readonly string[],
  idFuente: string,
  activa: boolean,
  idActual: string,
): string[] {
  if (idFuente === idActual || !idFuente.trim()) return [...seleccionActual];
  if (!activa) return seleccionActual.filter((id) => id !== idFuente);
  if (seleccionActual.includes(idFuente) || seleccionActual.length >= MAX_FUENTES_CONTEXTO) {
    return [...seleccionActual];
  }
  return [...seleccionActual, idFuente];
}
