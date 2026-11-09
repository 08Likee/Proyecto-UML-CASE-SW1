import type {
  ModeloUml, MultiplicidadUml, RelacionUml,
} from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';

/**
 * En UML la multiplicidad de un extremo cuenta instancias de ESA clase por
 * cada instancia del extremo opuesto, con independencia de origen/destino.
 * Las lecturas se calculan del modelo persistido; nunca las inventa la IA.
 */
export interface LecturaRelacionUml {
  idRelacion: string;
  tipo: 'ASOCIACION' | 'AGREGACION' | 'COMPOSICION';
  idClaseOrigen: string;
  idClaseDestino: string;
  claseOrigen: string;
  claseDestino: string;
  cantidadDestinosPorOrigen: MultiplicidadUml;
  cantidadOrigenesPorDestino: MultiplicidadUml;
  desdeOrigen: string;
  desdeDestino: string;
}

function cantidad(multiplicidad: MultiplicidadUml): string {
  switch (multiplicidad) {
    case '1': return 'exactamente una instancia';
    case '0..1': return 'cero o una instancia';
    case '*':
    case '0..*': return 'cero o más instancias';
    case '1..*': return 'una o más instancias';
  }
}

function admiteLectura(relacion: RelacionUml): relacion is RelacionUml & {
  tipo: LecturaRelacionUml['tipo'];
  multiplicidadOrigen: MultiplicidadUml;
  multiplicidadDestino: MultiplicidadUml;
} {
  return (relacion.tipo === 'ASOCIACION' || relacion.tipo === 'AGREGACION' || relacion.tipo === 'COMPOSICION')
    && relacion.multiplicidadOrigen !== null && relacion.multiplicidadDestino !== null;
}

export function interpretarRelacionesUml(modelo: ModeloUml): LecturaRelacionUml[] {
  const nombres = new Map(modelo.contenido.clases.map((clase) => [clase.id, clase.nombre]));
  const lecturas: LecturaRelacionUml[] = [];
  for (const relacion of modelo.contenido.relaciones) {
    if (!admiteLectura(relacion)) continue;
    const claseOrigen = nombres.get(relacion.idClaseOrigen);
    const claseDestino = nombres.get(relacion.idClaseDestino);
    // Sin extremos identificables o roles para una autorrelación no inventar interpretaciones.
    if (!claseOrigen || !claseDestino || relacion.idClaseOrigen === relacion.idClaseDestino) continue;
    lecturas.push({
      idRelacion: relacion.id,
      tipo: relacion.tipo,
      idClaseOrigen: relacion.idClaseOrigen,
      idClaseDestino: relacion.idClaseDestino,
      claseOrigen,
      claseDestino,
      cantidadDestinosPorOrigen: relacion.multiplicidadDestino,
      cantidadOrigenesPorDestino: relacion.multiplicidadOrigen,
      desdeOrigen: `Cada instancia de «${claseOrigen}» se relaciona con ${cantidad(relacion.multiplicidadDestino)} de «${claseDestino}».`,
      desdeDestino: `Cada instancia de «${claseDestino}» se relaciona con ${cantidad(relacion.multiplicidadOrigen)} de «${claseOrigen}».`,
    });
  }
  return lecturas;
}

function mencionaNombre(pregunta: string, nombre: string): boolean {
  const texto = pregunta.toLocaleLowerCase('es');
  const objetivo = nombre.toLocaleLowerCase('es');
  if (!objetivo) return false;
  let inicio = texto.indexOf(objetivo);
  const letra = /[\p{L}\p{N}_]/u;
  while (inicio !== -1) {
    const antes = inicio === 0 ? '' : texto[inicio - 1];
    const fin = inicio + objetivo.length;
    const despues = fin === texto.length ? '' : texto[fin];
    if ((!antes || !letra.test(antes)) && (!despues || !letra.test(despues))) return true;
    inicio = texto.indexOf(objetivo, inicio + 1);
  }
  return false;
}

/** Resumen selectivo, acotado y siempre derivado de la versión autorizada. */
export function resumenRelacionesVerificadas(modelo: ModeloUml, pregunta: string): string | null {
  const lecturas = interpretarRelacionesUml(modelo);
  const clasesNombradas = new Set(modelo.contenido.clases
    .filter((clase) => mencionaNombre(pregunta, clase.nombre)).map((clase) => clase.id));
  const temaRelaciones = /relaci[oó]n|asociaci[oó]n|multiplicidad|cardinalidad|conectores?|v[ií]nculos?/iu.test(pregunta);
  if (clasesNombradas.size === 0 && !temaRelaciones) return null;
  const relevantes = clasesNombradas.size > 0
    ? lecturas.filter((r) => clasesNombradas.has(r.idClaseOrigen) || clasesNombradas.has(r.idClaseDestino))
    : lecturas;
  if (relevantes.length === 0) return null;
  const MAX_LECTURAS = 8;
  const lineas = relevantes.slice(0, MAX_LECTURAS)
    .map((r) => `- **${r.tipo} (${r.claseOrigen} / ${r.claseDestino})**: ${r.desdeOrigen} ${r.desdeDestino}`);
  if (relevantes.length > MAX_LECTURAS) {
    lineas.push(`Se muestran ${MAX_LECTURAS} de ${relevantes.length} relaciones relevantes; las demás no se han descrito aquí.`);
  }
  return lineas.join('\n');
}
