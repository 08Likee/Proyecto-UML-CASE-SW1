/**
 * CU-09: el chat sólo transfiere un borrador explícito al intérprete
 * existente. No interpreta, aplica ni guarda cambios UML por sí mismo.
 */
export interface ContextoTraspasoOrdenUml {
  idModeloAbierto?: string;
  puedeEditarModelo: boolean;
  modeloSincronizado: boolean;
  conversacionActiva: boolean;
  accesoDisponible: boolean;
  procesando: boolean;
  vozInactiva: boolean;
}

export function prepararTraspasoOrdenUml(
  texto: string,
  contexto: ContextoTraspasoOrdenUml,
): string | null {
  if (
    !contexto.idModeloAbierto ||
    !contexto.puedeEditarModelo ||
    !contexto.modeloSincronizado ||
    !contexto.conversacionActiva ||
    !contexto.accesoDisponible ||
    contexto.procesando ||
    !contexto.vozInactiva
  ) return null;

  const instruccion = texto.trim();
  return instruccion.length >= 1 && instruccion.length <= 8000
    ? instruccion
    : null;
}
