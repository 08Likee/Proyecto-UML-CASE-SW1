/** Solamente se convierten a diagramas los bloques identificados explícitamente. */
export function esBloqueMermaid(clase: string | undefined): boolean {
  return /(?:^|\s)language-mermaid(?:\s|$)/i.test(clase ?? '');
}

/** Evita enlaces javascript:, data:, relativos e inseguros introducidos por la IA. */
export function urlExternaSegura(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
