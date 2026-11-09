import type { ConversacionIa, MensajeIa, PropuestaUmlIa } from '../types/conversaciones-ia.types';

// Los mensajes se identifican por UUID, nunca por contenido (dos usuarios pueden enviar lo mismo).
export function unirMensajes(actuales: MensajeIa[], recibidos: MensajeIa[]): MensajeIa[] {
  const unicos = new Map<string, MensajeIa>();
  for (const mensaje of [...actuales, ...recibidos]) {
    unicos.set(mensaje.id, mensaje);
  }
  return [...unicos.values()].sort((a, b) =>
    a.fechaCreacion.localeCompare(b.fechaCreacion) || a.id.localeCompare(b.id),
  );
}

export function unirConversaciones(
  actuales: ConversacionIa[],
  recibidas: ConversacionIa[],
): ConversacionIa[] {
  const unicas = new Map<string, ConversacionIa>();
  for (const conversacion of [...actuales, ...recibidas]) {
    unicas.set(conversacion.id, conversacion);
  }
  return [...unicas.values()].sort((a, b) =>
    b.fechaActualizacion.localeCompare(a.fechaActualizacion) || b.id.localeCompare(a.id),
  );
}

// Al reabrir el chat del diagramador, recuperar la conversación seleccionada
// solo si sigue perteneciendo al listado autorizado del proyecto actual.
export function elegirConversacionInicial(
  conversaciones: ConversacionIa[],
  idPreferido?: string | null,
): string | null {
  if (idPreferido && conversaciones.some((item) => item.id === idPreferido)) {
    return idPreferido;
  }
  return conversaciones.find((item) => item.estado === 'ACTIVA')?.id
    ?? conversaciones[0]?.id
    ?? null;
}

// Los mensajes históricos son inmutables: su UUID vincula la respuesta IA
// con una propuesta cuyo estado puede cambiar posteriormente. No se interpreta
// texto libre del proveedor como una orden ni se modifica el contenido guardado.
export function encontrarPropuestaDeMensajeIa(
  contenido: string,
  propuestas: ReadonlyArray<Pick<PropuestaUmlIa, 'id' | 'estado' | 'versionActual'>>,
): Pick<PropuestaUmlIa, 'id' | 'estado' | 'versionActual'> | null {
  return propuestas.find((propuesta) =>
    contenido.includes(`**Identificador:** \`${propuesta.id}\``),
  ) ?? null;
}
