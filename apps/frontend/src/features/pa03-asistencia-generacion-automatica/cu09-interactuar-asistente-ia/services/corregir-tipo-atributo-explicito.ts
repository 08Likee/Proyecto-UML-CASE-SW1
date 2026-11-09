/**
 * Recuperación semántica limitada: una salida FALTAN_DATOS puede preguntar por
 * un tipo de atributo que el usuario ya escribió de forma inequívoca.
 * No interpreta instrucciones compuestas, no deduce tipos y no ejecuta UML.
 */
export function corregirTipoDeAtributoExplicito(
  salida: unknown,
  instruccion: string,
  clases: readonly { nombre: string }[],
  hayContextoPendiente: boolean,
): unknown {
  if (
    hayContextoPendiente ||
    typeof salida !== 'object' ||
    salida === null ||
    Array.isArray(salida)
  ) {
    return salida;
  }
  const respuesta = salida as Record<string, unknown>;
  if (respuesta.version !== 1 || respuesta.estado !== 'FALTAN_DATOS') return salida;

  const pregunta = typeof respuesta.pregunta === 'string' ? respuesta.pregunta : '';
  const datosFaltantes = Array.isArray(respuesta.datosFaltantes)
    ? respuesta.datosFaltantes
        .filter((dato): dato is string => typeof dato === 'string')
        .join(' ')
    : '';
  if (!/\btipo\b/i.test(`${pregunta} ${datosFaltantes}`)) return salida;

  // Se acepta exclusivamente esta orden simple y completa (sin otras acciones).
  const patron = /^agrega\s+a\s+la\s+clase\s+(.+?)\s+un\s+atributo\s+llamado\s+([a-z_][a-z0-9_]*)\s+de\s+tipo\s+([a-z_][a-z0-9_]*(?:\[\])?)\.?$/iu;
  const coincidencia = patron.exec(instruccion.trim());
  if (!coincidencia) return salida;

  const [, nombreClase, nombreAtributo, tipoAtributo] = coincidencia;
  const encontradas = clases.filter(
    (clase) =>
      clase.nombre.trim().toLocaleLowerCase('es') ===
      nombreClase.trim().toLocaleLowerCase('es'),
  );
  if (encontradas.length !== 1) return salida;

  return {
    version: 1,
    estado: 'LISTA',
    acciones: [
      {
        tipo: 'AGREGAR_ATRIBUTO',
        clase: { nombre: encontradas[0].nombre },
        atributo: { nombre: nombreAtributo, tipo: tipoAtributo },
      },
    ],
  };
}
