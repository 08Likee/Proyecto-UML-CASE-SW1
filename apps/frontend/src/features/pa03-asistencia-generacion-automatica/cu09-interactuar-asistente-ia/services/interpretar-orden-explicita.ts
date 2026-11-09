import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types.ts';
import type { IntencionAsistente } from '../types/intencion-asistente.types.ts';
import { validarIntencionAsistente } from './validar-intencion-asistente.ts';

/**
 * Ruta determinista y conservadora del asistente híbrido CU-09.
 * Solo reconoce una orden completa de una de las formas explícitas soportadas.
 * Si hay dudas, devuelve null para usar el intérprete WebLLM existente.
 * La validación y la autorización del cambio siguen fuera de esta función.
 */
/** Una referencia solo es directa cuando existe exactamente una coincidencia. */
function claseUnica(contenido: ModeloUmlContenido, nombre: string) {
  const coincidencias = contenido.clases.filter(
    (clase) => clase.nombre.trim().toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'),
  );
  return coincidencias.length === 1 ? coincidencias[0] : null;
}

function atributoUnico(clase: ModeloUmlContenido['clases'][number], nombre: string) {
  const coincidencias = clase.atributos.filter(
    (atributo) => atributo.nombre.trim().toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'),
  );
  return coincidencias.length === 1 ? coincidencias[0] : null;
}

export function interpretarOrdenExplicita(
  instruccion: string,
  contenido: ModeloUmlContenido,
  hayContextoPendiente: boolean,
): IntencionAsistente | null {
  if (hayContextoPendiente) return null;
  const texto = instruccion.trim();
  let propuesta: unknown = null;

  // Clase nueva sin atributos ni operaciones: los nombres compuestos o las
  // instrucciones con condiciones adicionales se remiten a WebLLM.
  const crearClase = /^(?:crea|crear)\s+(?:(?:una|la)\s+)?clase\s+(?:llamada\s+)?([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto);
  if (crearClase) {
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{ tipo: 'CREAR_CLASE', nombre: crearClase[1] }],
    };
  }

  // No se asume un tipo ni una visibilidad: el tipo tiene que ser explícito;
  // la visibilidad opcional queda a cargo del ejecutor (PRIVADA por defecto).
  // Variantes acotadas de una MISMA orden: clase, atributo y tipo explícitos.
  // Todas las expresiones están ancladas para no absorber órdenes compuestas.
  const agregarAtributo =
    /^(?:agrega|agregar|añade|añadir|incorpora)\s+a\s+(?:(?:la\s+)?clase\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+(?:(?:un|el|alg[uú]n)\s+)?(?:atributo|campo)\s+(?:llamado\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+de\s+tipo\s+([\p{L}_][\p{L}\p{N}_]*(?:\[\])?)\.?$/iu.exec(texto) ??
    /^(?:a\s+(?:la\s+)?clase\s+|en\s+(?:(?:la\s+)?clase\s+)?)([\p{L}_][\p{L}\p{N}_]*)\s*,?\s+(?:agrega|añade|incorpora)\s+(?:(?:un|el|alg[uú]n)\s+)?(?:atributo|campo)\s+(?:llamado\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+(?:de\s+tipo\s+)?([\p{L}_][\p{L}\p{N}_]*(?:\[\])?)\.?$/iu.exec(texto) ??
    /^(?:a\s+(?:la\s+)?clase\s+|en\s+(?:(?:la\s+)?clase\s+)?)([\p{L}_][\p{L}\p{N}_]*)\s*,?\s+(?:agr[eé]gale|a[nñ][aá]dele)\s+(?:(?:(?:un|el)\s+)?(?:atributo|campo)\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+de\s+tipo\s+([\p{L}_][\p{L}\p{N}_]*(?:\[\])?)\.?$/iu.exec(texto) ??
    /^(?:la\s+clase\s+)([\p{L}_][\p{L}\p{N}_]*)\s*,?\s+(?:agrega|añade|incorpora)\s+(?:(?:un|el|alg[uú]n)\s+)?(?:atributo|campo)\s+(?:llamado\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+de\s+tipo\s+([\p{L}_][\p{L}\p{N}_]*(?:\[\])?)\.?$/iu.exec(texto);
  // Variante con el atributo primero: "Incorpora edad como Integer dentro de Cliente".
  const agregarAtributoConClaseFinal =
    /^(?:incorpora|agrega|añade)\s+(?:(?:(?:un|el)\s+)?(?:atributo|campo)\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+como\s+([\p{L}_][\p{L}\p{N}_]*(?:\[\])?)\s+(?:dentro\s+de|en)\s+(?:(?:la\s+)?clase\s+)?([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto);
  if (agregarAtributo || agregarAtributoConClaseFinal) {
    const nombreClase = agregarAtributo ? agregarAtributo[1] : agregarAtributoConClaseFinal![3];
    const nombreAtributo = agregarAtributo ? agregarAtributo[2] : agregarAtributoConClaseFinal![1];
    const tipoAtributo = agregarAtributo ? agregarAtributo[3] : agregarAtributoConClaseFinal![2];
    // Canoniza solo tipos UML conocidos; no cambia nombres de tipos definidos por el usuario.
    const tipoEstandar = ['String', 'Integer', 'Boolean', 'Double', 'Float', 'Decimal', 'Text']
      .find((tipo) => tipo.toLocaleLowerCase('es') === tipoAtributo.toLocaleLowerCase('es'));
    // Solo se toma la ruta directa con una clase inequívocamente existente.
    // Los casos ausentes o ambiguos se dejan al flujo normal del asistente.
    const clase = claseUnica(contenido, nombreClase);
    if (!clase) return null;
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{
        tipo: 'AGREGAR_ATRIBUTO',
        clase: { id: clase.id },
        atributo: { nombre: nombreAtributo, tipo: tipoEstandar ?? tipoAtributo },
      }],
    };
  }

  // Renombra una única clase existente. El ejecutor conserva su id,
  // atributos, operaciones y relaciones, y rechaza nombres ya utilizados.
  const renombrarClase = /^(?:renombra|renombrar|cambia\s+el\s+nombre\s+de)\s+(?:la\s+)?clase\s+([\p{L}_][\p{L}\p{N}_]*)\s+a\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto);
  if (renombrarClase) {
    const [, nombreAnterior, nombreNuevo] = renombrarClase;
    const clase = claseUnica(contenido, nombreAnterior);
    if (!clase) return null;
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{ tipo: 'RENOMBRAR_CLASE', clase: { id: clase.id }, nuevoNombre: nombreNuevo }],
    };
  }

  // MODIFICAR_ATRIBUTO: cambia únicamente una propiedad explícita.
  // El atributo y la clase deben existir de manera inequívoca.
  const cambiarTipo = /^(?:cambia|cambiar|modifica|modificar)\s+el\s+tipo\s+del\s+atributo\s+([\p{L}_][\p{L}\p{N}_]*)\s+de\s+la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\s+a\s+([\p{L}_][\p{L}\p{N}_]*(?:\[\])?)\.?$/iu.exec(texto);
  const renombrarAtributo = /^(?:renombra|renombrar)\s+el\s+atributo\s+([\p{L}_][\p{L}\p{N}_]*)\s+de\s+la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\s+a\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto);
  const cambiarVisibilidad = /^(?:cambia|cambiar|modifica|modificar)\s+la\s+visibilidad\s+del\s+atributo\s+([\p{L}_][\p{L}\p{N}_]*)\s+de\s+la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\s+a\s+(p[uú]blica|privada|protegida|paquete)\.?$/iu.exec(texto);
  const modificarAtributo = cambiarTipo ?? renombrarAtributo ?? cambiarVisibilidad;
  if (modificarAtributo) {
    const [, nombreAtributo, nombreClase, valorNuevo] = modificarAtributo;
    const clase = claseUnica(contenido, nombreClase);
    if (!clase) return null;
    const atributo = atributoUnico(clase, nombreAtributo);
    if (!atributo) return null;
    const cambios = cambiarTipo
      ? { tipo: valorNuevo }
      : renombrarAtributo
        ? { nombre: valorNuevo }
        : { visibilidad: valorNuevo.toLocaleUpperCase('es').replace('Ú', 'U') };
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{
        tipo: 'MODIFICAR_ATRIBUTO',
        clase: { id: clase.id },
        atributo: { id: atributo.id },
        cambios,
      }],
    };
  }

  // CONFIGURAR_PERSISTENCIA. Una llave identificadora implica marcar
  // también la clase como persistente, sin inventar el atributo.
  const persistenciaConId =
    /^(?:haz|hacer)\s+persistente\s+(?:a\s+)?la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\s+y\s+(?:usa|utiliza)\s+(?:el\s+atributo\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+como\s+(?:identificador|llave\s+(?:primaria|persistente))\.?$/iu.exec(texto) ??
    /^(?:marca|marcar)\s+(?:a\s+)?la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\s+como\s+persistente\s+y\s+(?:usa|utiliza)\s+(?:el\s+atributo\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+como\s+(?:identificador|llave\s+(?:primaria|persistente))\.?$/iu.exec(texto) ??
    /^la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\s*,\s*el\s+atributo\s+([\p{L}_][\p{L}\p{N}_]*)\s+(?:col[oó]calo|ponlo|config[uú]ralo)\s+como\s+(?:llave\s+(?:persistente|primaria)|identificador\s+persistente)\.?$/iu.exec(texto);
  if (persistenciaConId) {
    const [, nombreClase, nombreAtributo] = persistenciaConId;
    const clase = claseUnica(contenido, nombreClase);
    if (!clase) return null;
    // No elegimos automáticamente entre atributos con el mismo nombre.
    const candidatos = clase.atributos.filter(
      (atributo) => atributo.nombre.trim().toLocaleLowerCase('es') === nombreAtributo.toLocaleLowerCase('es'),
    );
    if (candidatos.length > 1) return null;
    // Si no existe, el ejecutor devolverá ATRIBUTO_NO_ENCONTRADO.
    // No se crea ni se supone que exista un atributo que no está en el modelo.
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{
        tipo: 'CONFIGURAR_PERSISTENCIA',
        clase: { id: clase.id },
        persistente: true,
        atributoIdentificador: candidatos.length === 1
          ? { id: candidatos[0].id }
          : { nombre: nombreAtributo },
      }],
    };
  }

  const activarPersistencia =
    /^(?:haz|hacer)\s+persistente\s+(?:a\s+)?la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto) ??
    /^(?:marca|marcar)\s+(?:a\s+)?la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\s+como\s+persistente\.?$/iu.exec(texto);
  const desactivarPersistencia = /^(?:desactiva|desactivar)\s+la\s+persistencia\s+de\s+la\s+clase\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto);
  if (activarPersistencia || desactivarPersistencia) {
    const nombreClase = (activarPersistencia ?? desactivarPersistencia)![1];
    const clase = claseUnica(contenido, nombreClase);
    if (!clase) return null;
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{ tipo: 'CONFIGURAR_PERSISTENCIA', clase: { id: clase.id }, persistente: Boolean(activarPersistencia) }],
    };
  }

  // AGREGAR_OPERACION: solo métodos sin parámetros, con retorno explícito,
  // o indicados expresamente como "sin parámetros". No se inventa una firma.
  const agregarOperacion = /^(?:agrega|agregar|añade|añadir)\s+a\s+(?:(?:la\s+)?clase\s+)?([\p{L}_][\p{L}\p{N}_]*)\s+(?:una\s+operaci[oó]n\s+llamada|la\s+operaci[oó]n)\s+([\p{L}_][\p{L}\p{N}_]*)(\s+sin\s+par[aá]metros)?(?:\s+que\s+(?:retorna|devuelve)\s+([\p{L}_][\p{L}\p{N}_]*(?:\[\])?))?\.?$/iu.exec(texto);
  if (agregarOperacion) {
    const [, nombreClase, nombreOperacion, sinParametros, tipoRetorno] = agregarOperacion;
    if (!sinParametros && !tipoRetorno) return null;
    const clase = claseUnica(contenido, nombreClase);
    if (!clase) return null;
    const repetida = clase.operaciones.some(
      (operacion) => operacion.nombre.trim().toLocaleLowerCase('es') === nombreOperacion.toLocaleLowerCase('es') && operacion.parametros.length === 0,
    );
    if (repetida) {
      // Evita duplicar la misma firma; no pasa por un fallback impredecible.
      propuesta = {
        version: 1,
        estado: 'NO_SOPORTADA',
        motivo: `La clase ${clase.nombre} ya contiene una operación sin parámetros llamada ${nombreOperacion}.`,
      };
    } else {
      propuesta = {
        version: 1,
        estado: 'LISTA',
        acciones: [{
          tipo: 'AGREGAR_OPERACION',
          clase: { id: clase.id },
          operacion: { nombre: nombreOperacion, parametros: [], ...(tipoRetorno ? { tipoRetorno } : {}) },
        }],
      };
    }
  }


  // CREAR_RELACION: la ruta directa no infiere sentidos ni multiplicidades.
  // En generalización, origen=hija y destino=padre, sin cardinalidades.
  const herencia =
    /^(?:crea|crear)\s+una\s+generalizaci[oó]n\s+donde\s+([\p{L}_][\p{L}\p{N}_]*)\s+hereda\s+de\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto) ??
    /^(?:crea|crear)\s+una\s+generalizaci[oó]n\s+de\s+([\p{L}_][\p{L}\p{N}_]*)\s+hacia\s+([\p{L}_][\p{L}\p{N}_]*)\.?$/iu.exec(texto);
  if (herencia) {
    const hija = claseUnica(contenido, herencia[1]);
    const padre = claseUnica(contenido, herencia[2]);
    if (!hija || !padre || hija.id === padre.id) return null;
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{
        tipo: 'CREAR_RELACION',
        origen: { id: hija.id },
        destino: { id: padre.id },
        tipoRelacion: 'GENERALIZACION',
      }],
    };
  }

  // Asociación dirigida: la orden debe especificar ambas multiplicidades.
  const asociacion =
    /^(?:crea|crear)\s+una\s+asociaci[oó]n\s+de\s+([\p{L}_][\p{L}\p{N}_]*)\s+hacia\s+([\p{L}_][\p{L}\p{N}_]*)\s+con\s+multiplicidad\s+de\s+origen\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\s+y\s+de\s+destino\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\.?$/iu.exec(texto) ??
    // Variante equivalente: "multiplicidad 1 en origen y 0..* en destino".
    /^(?:crea|crear)\s+una\s+asociaci[oó]n\s+de\s+([\p{L}_][\p{L}\p{N}_]*)\s+hacia\s+([\p{L}_][\p{L}\p{N}_]*)\s+con\s+multiplicidad\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\s+en\s+origen\s+y\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\s+en\s+destino\.?$/iu.exec(texto);
  const asociacionPorClase =
    /^(?:crea|crear)\s+una\s+asociaci[oó]n\s+de\s+([\p{L}_][\p{L}\p{N}_]*)\s+hacia\s+([\p{L}_][\p{L}\p{N}_]*)\s+con\s+multiplicidad\s+en\s+([\p{L}_][\p{L}\p{N}_]*)\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\s+y\s+en\s+([\p{L}_][\p{L}\p{N}_]*)\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\.?$/iu.exec(texto);
  if (asociacion || asociacionPorClase) {
    const [, nombreOrigen, nombreDestino] = (asociacion ?? asociacionPorClase)!;
    if (asociacionPorClase && (
      asociacionPorClase[3].toLocaleLowerCase('es') !== nombreOrigen.toLocaleLowerCase('es') ||
      asociacionPorClase[5].toLocaleLowerCase('es') !== nombreDestino.toLocaleLowerCase('es')
    )) return null;
    const origen = claseUnica(contenido, nombreOrigen);
    const destino = claseUnica(contenido, nombreDestino);
    if (!origen || !destino || origen.id === destino.id) return null;
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{
        tipo: 'CREAR_RELACION',
        origen: { id: origen.id },
        destino: { id: destino.id },
        tipoRelacion: 'ASOCIACION',
        multiplicidadOrigen: asociacion ? asociacion[3] : asociacionPorClase![4],
        multiplicidadDestino: asociacion ? asociacion[4] : asociacionPorClase![6],
      }],
    };
  }

  // Agregación y composición: solo si el usuario señala explícitamente
  // cuál es el todo y cuál es la parte, además de ambas multiplicidades.
  const todoParte =
    /^(?:crea|crear)\s+una\s+(agregaci[oó]n|composici[oó]n)\s+donde\s+([\p{L}_][\p{L}\p{N}_]*)\s+es\s+el\s+todo\s+y\s+([\p{L}_][\p{L}\p{N}_]*)\s+es\s+la\s+parte,?\s+con\s+multiplicidad\s+de\s+origen\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\s+y\s+de\s+destino\s+(0\.\.1|0\.\.\*|1\.\.\*|1|\*)\.?$/iu.exec(texto);
  if (todoParte) {
    const [, nombreTipo, nombreTodo, nombreParte, multiplicidadTodo, multiplicidadParte] = todoParte;
    const todo = claseUnica(contenido, nombreTodo);
    const parte = claseUnica(contenido, nombreParte);
    if (!todo || !parte || todo.id === parte.id) return null;
    propuesta = {
      version: 1,
      estado: 'LISTA',
      acciones: [{
        tipo: 'CREAR_RELACION',
        origen: { id: todo.id },
        destino: { id: parte.id },
        tipoRelacion: /^composici[oó]n$/iu.test(nombreTipo) ? 'COMPOSICION' : 'AGREGACION',
        multiplicidadOrigen: multiplicidadTodo,
        multiplicidadDestino: multiplicidadParte,
      }],
    };
  }

  if (!propuesta) return null;
  const validacion = validarIntencionAsistente(propuesta);
  return validacion.valida ? validacion.intencion : null;
}
