import type { ModeloUml, MultiplicidadUml, TipoRelacionUml, VisibilidadUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import type { AtributoPropuestoUml, CambiosPropuestosUml } from '../models/propuesta-uml-ia';

export class PropuestaUmlInvalidaError extends Error {
  constructor() { super('La IA no devolvió una propuesta UML segura y compatible con el modelo actual.'); }
}

const VISIBILIDADES = new Set<VisibilidadUml>(['PUBLICA', 'PRIVADA', 'PROTEGIDA', 'PAQUETE']);
const RELACIONES = new Set<TipoRelacionUml>(['ASOCIACION', 'AGREGACION', 'COMPOSICION', 'GENERALIZACION']);
const MULTIPLICIDADES = new Set<MultiplicidadUml>(['1', '0..1', '*', '0..*', '1..*']);
const NORMALIZAR = (texto: string) => texto.toLocaleLowerCase('es').normalize('NFC');

function error(): never { throw new PropuestaUmlInvalidaError(); }
function objeto(valor: unknown, campos: readonly string[]): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) error();
  const registro = valor as Record<string, unknown>;
  if (Object.keys(registro).length !== campos.length || campos.some((campo) => !Object.hasOwn(registro, campo))) error();
  return registro;
}
function texto(valor: unknown, max: number): string {
  if (typeof valor !== 'string') error();
  const limpio = valor.trim();
  if (!limpio || limpio.length > max) error();
  // charCodeAt examina unidades UTF-16 sin descomponer caracteres Unicode ni emojis.
  // Los caracteres de control ASCII se rechazan incluso dentro del texto.
  for (let i = 0; i < valor.length; i += 1) {
    const codigo = valor.charCodeAt(i);
    if (codigo <= 31 || codigo === 127) error();
  }
  return limpio;
}
function arreglo(valor: unknown, max: number): unknown[] {
  if (!Array.isArray(valor) || valor.length > max) error();
  return valor;
}
function nombre(valor: unknown): string {
  const resultado = texto(valor, 80);
  // Se restringen nuevos identificadores UML a un subconjunto que soporta el modelador.
  if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(resultado)) error();
  return resultado;
}
function atributos(valor: unknown): AtributoPropuestoUml[] {
  const vistos = new Set<string>();
  return arreglo(valor, 8).map((entrada) => {
    const dato = objeto(entrada, ['nombre', 'tipo', 'visibilidad']);
    const n = nombre(dato.nombre);
    const tipo = texto(dato.tipo, 80);
    if (vistos.has(NORMALIZAR(n)) || !VISIBILIDADES.has(dato.visibilidad as VisibilidadUml)) error();
    vistos.add(NORMALIZAR(n));
    return { nombre: n, tipo, visibilidad: dato.visibilidad as VisibilidadUml };
  });
}

/** Validación propia: un JSON Schema válido no garantiza semántica UML correcta. */
export function validarPropuestaUmlIa(valor: unknown, modelo: ModeloUml): CambiosPropuestosUml {
  const base = objeto(valor, ['resumen', 'clasesNuevas', 'atributosEnClasesExistentes', 'relacionesNuevas']);
  const resumen = texto(base.resumen, 800);
  const existentes = new Map(modelo.contenido.clases.map((c) => [NORMALIZAR(c.nombre), c]));
  const disponibles = new Set(existentes.keys());
  const clasesNuevas = arreglo(base.clasesNuevas, 3).map((entrada) => {
    const c = objeto(entrada, ['nombre', 'atributos']);
    const n = nombre(c.nombre);
    const clave = NORMALIZAR(n);
    if (disponibles.has(clave)) error();
    disponibles.add(clave);
    return { nombre: n, atributos: atributos(c.atributos) };
  });
  const clasesModificadas = new Set<string>();
  const atributosEnClasesExistentes = arreglo(base.atributosEnClasesExistentes, 3).map((entrada) => {
    const c = objeto(entrada, ['clase', 'atributos']);
    const clase = nombre(c.clase);
    const clave = NORMALIZAR(clase);
    const anterior = existentes.get(clave);
    if (!anterior || clasesModificadas.has(clave)) error();
    clasesModificadas.add(clave);
    const nuevos = atributos(c.atributos);
    if (!nuevos.length) error();
    const nombresPrevios = new Set(anterior.atributos.map((a) => NORMALIZAR(a.nombre)));
    if (nuevos.some((a) => nombresPrevios.has(NORMALIZAR(a.nombre)))) error();
    return { clase: anterior.nombre, atributos: nuevos };
  });
  const relacionesVistas = new Set<string>();
  const relacionesNuevas = arreglo(base.relacionesNuevas, 4).map((entrada) => {
    const r = objeto(entrada, ['tipo', 'claseOrigen', 'claseDestino', 'nombre', 'multiplicidadOrigen', 'multiplicidadDestino']);
    const tipo = r.tipo as TipoRelacionUml;
    const origen = nombre(r.claseOrigen);
    const destino = nombre(r.claseDestino);
    const mo = r.multiplicidadOrigen as MultiplicidadUml | null;
    const md = r.multiplicidadDestino as MultiplicidadUml | null;
    if (!RELACIONES.has(tipo) || !disponibles.has(NORMALIZAR(origen)) || !disponibles.has(NORMALIZAR(destino)) || NORMALIZAR(origen) === NORMALIZAR(destino)) error();
    if (tipo === 'GENERALIZACION' ? (mo !== null || md !== null) : (!MULTIPLICIDADES.has(mo as MultiplicidadUml) || !MULTIPLICIDADES.has(md as MultiplicidadUml))) error();
    const n = r.nombre === null ? null : texto(r.nombre, 80);
    const clave = `${tipo}:${NORMALIZAR(origen)}:${NORMALIZAR(destino)}`;
    if (relacionesVistas.has(clave)) error();
    relacionesVistas.add(clave);
    const origenExistente = existentes.get(NORMALIZAR(origen));
    const destinoExistente = existentes.get(NORMALIZAR(destino));
    if (origenExistente && destinoExistente && modelo.contenido.relaciones.some((rel) =>
      rel.tipo === tipo && rel.idClaseOrigen === origenExistente.id && rel.idClaseDestino === destinoExistente.id)) error();
    return { tipo, claseOrigen: origen, claseDestino: destino, nombre: n, multiplicidadOrigen: mo, multiplicidadDestino: md };
  });
  if (!clasesNuevas.length && !atributosEnClasesExistentes.length && !relacionesNuevas.length) error();
  return { resumen, clasesNuevas, atributosEnClasesExistentes, relacionesNuevas };
}
