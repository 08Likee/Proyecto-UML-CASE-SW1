/**
 * CU-09: una relación mencionada sin sentido y/o multiplicidades no debe
 * consumir WebGPU para intentar adivinar esos datos. No crea intenciones de
 * cambio; solamente informa qué necesita indicar expresamente la persona.
 *
 * La expresión está anclada: órdenes compuestas o con condiciones adicionales
 * permanecen fuera de esta prevalidación y nunca se ejecutan aquí.
 */
const ENTRE_CLASES = /^(?:crea|crear)\s+una\s+(asociaci[oó]n|agregaci[oó]n|composici[oó]n)\s+entre\s+([\p{L}_][\p{L}\p{N}_]*)\s+y\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu;
const ASOCIACION_SIN_MULTIPLICIDADES = /^(?:crea|crear)\s+una\s+asociaci[oó]n\s+de\s+([\p{L}_][\p{L}\p{N}_]*)\s+hacia\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu;
export function prevalidarRelacionIncompleta(
  instruccion: string,
  hayContextoPendiente: boolean,
): string | null {
  if (hayContextoPendiente) return null;
  const texto = instruccion.trim();
  const entre = ENTRE_CLASES.exec(texto);
  const dirigida = ASOCIACION_SIN_MULTIPLICIDADES.exec(texto);
  if (!entre && !dirigida) return null;

  if (entre) {
    const [, tipo, primera, segunda] = entre;
    if (/^asociaci[oó]n$/iu.test(tipo)) {
      return `No se creó ninguna relación. Para asociar ${primera} y ${segunda}, indicá cuál es el origen, cuál el destino y la multiplicidad de cada extremo. Ejemplo de formato (elegí vos los valores): "Crea una asociación de ${primera} hacia ${segunda} con multiplicidad de origen 1 y de destino 0..*."`;
    }
    return `No se creó ninguna relación. Para una ${tipo}, indicá cuál clase es el todo, cuál es la parte y ambas multiplicidades. Ejemplo de formato (valores ilustrativos): "Crea una ${tipo} donde ${primera} es el todo y ${segunda} es la parte, con multiplicidad de origen 1 y de destino 0..*."`;
  }

  return `No se creó ninguna relación. Para una asociación de ${dirigida![1]} hacia ${dirigida![2]}, especificá las multiplicidades de origen y de destino. Ejemplo de formato (valores ilustrativos): "Crea una asociación de ${dirigida![1]} hacia ${dirigida![2]} con multiplicidad de origen 1 y de destino 0..*."`;
}
