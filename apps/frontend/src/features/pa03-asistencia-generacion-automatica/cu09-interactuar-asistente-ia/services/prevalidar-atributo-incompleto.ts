import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types.ts';
import type { IntencionAsistente } from '../types/intencion-asistente.types.ts';
import { validarIntencionAsistente } from './validar-intencion-asistente.ts';

/**
 * Prevalidación local y deliberadamente limitada de solicitudes de atributos.
 * No usa WebLLM. Si el texto no coincide COMPLETAMENTE con una forma conocida,
 * devuelve null; nunca ejecuta acciones ni infiere tipos/nombres.
 */
export interface AtributoPendienteLocal {
  idClase: string;
  nombreClase: string;
  nombreAtributo: string | null;
  tipoAtributo: string | null;
}

type ResultadoPrevalidacion =
  | { estado: 'PREGUNTAR'; contexto: AtributoPendienteLocal; pregunta: string }
  | { estado: 'LISTA'; intencion: IntencionAsistente }
  | { estado: 'CANCELADA' }
  | { estado: 'ERROR'; mensaje: string };

const IDENT = '[\\p{L}_][\\p{L}\\p{N}_]*';
// Los patrones terminan en $: no recortamos ni ejecutamos la primera mitad de una orden compuesta.
const FALTA_TIPO = new RegExp(
  `^(?:agrega|agregar|añade|añadir|incorpora)\\s+(?:(?:un|el)\\s+)?(?:atributo|campo)\\s+(?:llamado\\s+)?(${IDENT})\\s+a\\s+(?:(?:la\\s+)?clase\\s+)?(${IDENT})\\.?$`, 'iu',
);
const FALTA_NOMBRE = new RegExp(
  `^(?:agrega|agregar|añade|añadir|incorpora)\\s+(?:un\\s+)?(?:atributo|campo)\\s+de\\s+tipo\\s+(${IDENT}(?:\\[\\])?)\\s+a\\s+(?:la\\s+)?clase\\s+(${IDENT})\\.?$`, 'iu',
);
const FALTAN_AMBOS = new RegExp(
  `^(?:agrega|agregar|añade|añadir|incorpora)\\s+(?:un\\s+)?(?:atributo|campo)\\s+a\\s+(?:la\\s+)?clase\\s+(${IDENT})\\.?$`, 'iu',
);
// Solicitud explícita de dos datos faltantes, sin interpretar órdenes adicionales.
const FALTAN_AMBOS_DECLARADOS = new RegExp(
  `^quiero\\s+(?:agregar|añadir)\\s+un\\s+atributo\\s+nuevo\\s+a\\s+la\\s+clase\\s+(${IDENT}),?\\s+pero\\s+todav[ií]a\\s+no\\s+he\\s+decidido\\s+qu[eé]\\s+nombre\\s+tendr[aá]\\s+ni\\s+qu[eé]\\s+tipo\\s+de\\s+dato\\s+utilizar[aá]\\.\\s+antes\\s+de\\s+modificar\\s+el\\s+diagrama,\\s+preg[uú]ntame\\s+por\\s+la\\s+informaci[oó]n\\s+que\\s+falta\\.?$`, 'iu',
);
const RESPUESTA_CAMPO = new RegExp(`^(nombre|tipo)\\s*:\\s*(${IDENT}(?:\\[\\])?)\\.?$`, 'iu');
const RESPUESTA_AMBOS = new RegExp(
  `^nombre\\s*:\\s*(${IDENT})\\s*[,;]\\s*tipo\\s*:\\s*(${IDENT}(?:\\[\\])?)\\.?$`, 'iu',
);
const RESPUESTA_ATRIBUTO_TIPO = new RegExp(
  `^(${IDENT})\\s+de\\s+tipo\\s+(${IDENT}(?:\\[\\])?)\\.?$`, 'iu',
);
const RESPUESTA_UNICA = new RegExp(`^(${IDENT}(?:\\[\\])?)\\.?$`, 'iu');

function tipoCanonico(tipo: string): string {
  const base = tipo.endsWith('[]') ? tipo.slice(0, -2) : tipo;
  const canon = ['String', 'Integer', 'Boolean', 'Double', 'Float', 'Decimal', 'Text']
    .find((conocido) => conocido.toLocaleLowerCase('es') === base.toLocaleLowerCase('es'));
  return (canon ?? base) + (tipo.endsWith('[]') ? '[]' : '');
}

function resultadoPara(contexto: AtributoPendienteLocal): ResultadoPrevalidacion {
  if (!contexto.nombreAtributo || !contexto.tipoAtributo) {
    return {
      estado: 'PREGUNTAR',
      contexto,
      pregunta: contexto.nombreAtributo
        ? `¿Qué tipo tendrá el atributo ${contexto.nombreAtributo} de ${contexto.nombreClase}? (Ej.: String)`
        : contexto.tipoAtributo
          ? `¿Qué nombre tendrá el nuevo atributo de ${contexto.nombreClase}? (Ej.: edad)`
          : `¿Qué nombre y tipo tendrá el nuevo atributo de ${contexto.nombreClase}? (Ej.: nombre: edad, tipo: Integer)`,
    };
  }
  const validacion = validarIntencionAsistente({
    version: 1,
    estado: 'LISTA',
    acciones: [{
      tipo: 'AGREGAR_ATRIBUTO',
      clase: { id: contexto.idClase },
      atributo: { nombre: contexto.nombreAtributo, tipo: tipoCanonico(contexto.tipoAtributo) },
    }],
  });
  if (!validacion.valida || !validacion.intencion) {
    return { estado: 'ERROR', mensaje: 'No se pudo validar la orden de atributo.' };
  }
  return { estado: 'LISTA', intencion: validacion.intencion };
}

function preparar(
  contenido: ModeloUmlContenido,
  nombreClase: string,
  nombreAtributo: string | null,
  tipoAtributo: string | null,
): ResultadoPrevalidacion {
  const clases = contenido.clases.filter(
    (clase) => clase.nombre.trim().toLocaleLowerCase('es') === nombreClase.toLocaleLowerCase('es'),
  );
  if (clases.length !== 1) {
    return {
      estado: 'ERROR',
      mensaje: clases.length === 0
        ? `No existe la clase ${nombreClase}.`
        : `Hay varias clases llamadas ${nombreClase}; no se puede elegir una automáticamente.`,
    };
  }
  if (nombreAtributo && clases[0].atributos.some(
    (atributo) => atributo.nombre.toLocaleLowerCase('es') === nombreAtributo.toLocaleLowerCase('es'),
  )) {
    return { estado: 'ERROR', mensaje: `La clase ${clases[0].nombre} ya tiene un atributo llamado ${nombreAtributo}.` };
  }
  return resultadoPara({
    idClase: clases[0].id,
    nombreClase: clases[0].nombre,
    nombreAtributo,
    tipoAtributo,
  });
}

export function detectarAtributoIncompleto(
  instruccion: string,
  contenido: ModeloUmlContenido,
): ResultadoPrevalidacion | null {
  const texto = instruccion.trim();
  const conNombre = FALTA_TIPO.exec(texto);
  if (conNombre) return preparar(contenido, conNombre[2], conNombre[1], null);
  const conTipo = FALTA_NOMBRE.exec(texto);
  if (conTipo) return preparar(contenido, conTipo[2], null, conTipo[1]);
  const sinDatos = FALTAN_AMBOS.exec(texto) ?? FALTAN_AMBOS_DECLARADOS.exec(texto);
  if (sinDatos) return preparar(contenido, sinDatos[1], null, null);
  return null;
}

export function completarAtributoIncompleto(
  respuesta: string,
  contenido: ModeloUmlContenido,
  contexto: AtributoPendienteLocal,
): ResultadoPrevalidacion {
  if (/^(?:cancelar|cancela|olvidar|anular)\.?$/iu.test(respuesta.trim())) {
    return { estado: 'CANCELADA' };
  }
  // La clase debe seguir existiendo con la identidad original.
  if (!contenido.clases.some((clase) => clase.id === contexto.idClase && clase.nombre === contexto.nombreClase)) {
    return { estado: 'ERROR', mensaje: 'La clase cambió o ya no existe. Cancela la solicitud e inicia una nueva.' };
  }
  const texto = respuesta.trim();
  const ambos = RESPUESTA_AMBOS.exec(texto) ?? RESPUESTA_ATRIBUTO_TIPO.exec(texto);
  if (ambos) {
    return resultadoPara({ ...contexto, nombreAtributo: contexto.nombreAtributo ?? ambos[1], tipoAtributo: contexto.tipoAtributo ?? ambos[2] });
  }
  const etiquetado = RESPUESTA_CAMPO.exec(texto);
  if (etiquetado) {
    const campo = etiquetado[1].toLocaleLowerCase('es');
    if (campo === 'nombre' && !contexto.nombreAtributo) {
      return resultadoPara({ ...contexto, nombreAtributo: etiquetado[2] });
    }
    if (campo === 'tipo' && !contexto.tipoAtributo) {
      return resultadoPara({ ...contexto, tipoAtributo: etiquetado[2] });
    }
  }
  const unica = RESPUESTA_UNICA.exec(texto);
  if (unica) {
    if (contexto.nombreAtributo && !contexto.tipoAtributo) {
      return resultadoPara({ ...contexto, tipoAtributo: unica[1] });
    }
    if (contexto.tipoAtributo && !contexto.nombreAtributo && !unica[1].endsWith('[]')) {
      return resultadoPara({ ...contexto, nombreAtributo: unica[1] });
    }
  }
  // Nunca se intenta WebLLM para una respuesta de contexto local no entendida.
  const resultado = resultadoPara(contexto);
  return resultado.estado === 'PREGUNTAR'
    ? { ...resultado, pregunta: `No entendí la respuesta. ${resultado.pregunta} Para cancelar escribe "cancelar".` }
    : resultado;
}
