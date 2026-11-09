import type {
  MultiplicidadUml,
  TipoRelacionUml,
  VisibilidadUml,
} from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types.ts';
import type {
  AccionAsistente,
  DefinicionAtributoAsistente,
  DefinicionOperacionAsistente,
  DefinicionParametroAsistente,
  IntencionAsistente,
  ReferenciaAtributoAsistente,
  ReferenciaClaseAsistente,
} from '../types/intencion-asistente.types.ts';

const VISIBILIDADES = new Set<VisibilidadUml>([
  'PUBLICA',
  'PRIVADA',
  'PROTEGIDA',
  'PAQUETE',
]);
const TIPOS_RELACION = new Set<TipoRelacionUml>([
  'ASOCIACION',
  'GENERALIZACION',
  'AGREGACION',
  'COMPOSICION',
]);
const MULTIPLICIDADES = new Set<MultiplicidadUml>([
  '1',
  '0..1',
  '*',
  '0..*',
  '1..*',
]);

export interface ResultadoValidacionIntencion {
  valida: boolean;
  intencion: IntencionAsistente | null;
  errores: string[];
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function exigirTexto(
  valor: unknown,
  campo: string,
  errores: string[],
): string | null {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    errores.push(`${campo} debe contener texto`);
    return null;
  }
  return valor.trim();
}

function leerTextoOpcional(
  valor: unknown,
  campo: string,
  errores: string[],
): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  return exigirTexto(valor, campo, errores) ?? undefined;
}

function leerReferencia(
  valor: unknown,
  campo: string,
  errores: string[],
): ReferenciaClaseAsistente | null {
  if (!esObjeto(valor)) {
    errores.push(`${campo} debe ser un objeto con id y/o nombre`);
    return null;
  }

  const id = typeof valor.id === 'string' && valor.id.trim() ? valor.id.trim() : undefined;
  const nombre =
    typeof valor.nombre === 'string' && valor.nombre.trim()
      ? valor.nombre.trim()
      : undefined;

  if (!id && !nombre) {
    errores.push(`${campo} debe incluir id o nombre`);
    return null;
  }

  return { id, nombre };
}

function leerVisibilidad(
  valor: unknown,
  campo: string,
  errores: string[],
): VisibilidadUml | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !VISIBILIDADES.has(valor as VisibilidadUml)) {
    errores.push(`${campo} debe ser PUBLICA, PRIVADA, PROTEGIDA o PAQUETE`);
    return undefined;
  }
  return valor as VisibilidadUml;
}

function leerAtributo(
  valor: unknown,
  campo: string,
  errores: string[],
): DefinicionAtributoAsistente | null {
  if (!esObjeto(valor)) {
    errores.push(`${campo} debe ser un objeto`);
    return null;
  }

  const nombre = exigirTexto(valor.nombre, `${campo}.nombre`, errores);
  const tipo = exigirTexto(valor.tipo, `${campo}.tipo`, errores);
  const visibilidad = leerVisibilidad(
    valor.visibilidad,
    `${campo}.visibilidad`,
    errores,
  );

  return nombre && tipo
    ? { nombre, tipo, ...(visibilidad ? { visibilidad } : {}) }
    : null;
}

function leerParametro(
  valor: unknown,
  campo: string,
  errores: string[],
): DefinicionParametroAsistente | null {
  if (!esObjeto(valor)) {
    errores.push(`${campo} debe ser un objeto`);
    return null;
  }

  const nombre = exigirTexto(valor.nombre, `${campo}.nombre`, errores);
  const tipo = exigirTexto(valor.tipo, `${campo}.tipo`, errores);
  return nombre && tipo ? { nombre, tipo } : null;
}

function leerOperacion(
  valor: unknown,
  campo: string,
  errores: string[],
): DefinicionOperacionAsistente | null {
  if (!esObjeto(valor)) {
    errores.push(`${campo} debe ser un objeto`);
    return null;
  }

  const nombre = exigirTexto(valor.nombre, `${campo}.nombre`, errores);
  const visibilidad = leerVisibilidad(
    valor.visibilidad,
    `${campo}.visibilidad`,
    errores,
  );
  const tipoRetorno = leerTextoOpcional(
    valor.tipoRetorno,
    `${campo}.tipoRetorno`,
    errores,
  );
  const parametros: DefinicionParametroAsistente[] = [];

  if (valor.parametros !== undefined) {
    if (!Array.isArray(valor.parametros)) {
      errores.push(`${campo}.parametros debe ser un arreglo`);
    } else {
      valor.parametros.forEach((parametro, indice) => {
        const parseado = leerParametro(
          parametro,
          `${campo}.parametros[${indice}]`,
          errores,
        );
        if (parseado) parametros.push(parseado);
      });
    }
  }

  return nombre
    ? {
        nombre,
        ...(visibilidad ? { visibilidad } : {}),
        ...(valor.parametros !== undefined ? { parametros } : {}),
        ...(tipoRetorno !== undefined ? { tipoRetorno } : {}),
      }
    : null;
}

function leerMultiplicidad(
  valor: unknown,
  campo: string,
  errores: string[],
): MultiplicidadUml | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (
    typeof valor !== 'string' ||
    !MULTIPLICIDADES.has(valor as MultiplicidadUml)
  ) {
    errores.push(`${campo} debe ser 1, 0..1, *, 0..* o 1..*`);
    return undefined;
  }
  return valor as MultiplicidadUml;
}

function leerAccion(
  valor: unknown,
  indice: number,
  errores: string[],
): AccionAsistente | null {
  const campo = `acciones[${indice}]`;
  if (!esObjeto(valor)) {
    errores.push(`${campo} debe ser un objeto`);
    return null;
  }

  const tipo = exigirTexto(valor.tipo, `${campo}.tipo`, errores);
  if (!tipo) return null;

  switch (tipo) {
    case 'CREAR_CLASE': {
      const nombre = exigirTexto(valor.nombre, `${campo}.nombre`, errores);
      const atributos: DefinicionAtributoAsistente[] = [];
      const operaciones: DefinicionOperacionAsistente[] = [];

      if (valor.atributos !== undefined) {
        if (!Array.isArray(valor.atributos)) {
          errores.push(`${campo}.atributos debe ser un arreglo`);
        } else {
          valor.atributos.forEach((atributo, i) => {
            const parseado = leerAtributo(
              atributo,
              `${campo}.atributos[${i}]`,
              errores,
            );
            if (parseado) atributos.push(parseado);
          });
        }
      }

      if (valor.operaciones !== undefined) {
        if (!Array.isArray(valor.operaciones)) {
          errores.push(`${campo}.operaciones debe ser un arreglo`);
        } else {
          valor.operaciones.forEach((operacion, i) => {
            const parseada = leerOperacion(
              operacion,
              `${campo}.operaciones[${i}]`,
              errores,
            );
            if (parseada) operaciones.push(parseada);
          });
        }
      }

      if (valor.persistente !== undefined && typeof valor.persistente !== 'boolean') {
        errores.push(`${campo}.persistente debe ser booleano`);
      }
      const atributoIdentificador = leerTextoOpcional(
        valor.atributoIdentificador,
        `${campo}.atributoIdentificador`,
        errores,
      );

      return nombre
        ? {
            tipo,
            nombre,
            ...(valor.atributos !== undefined ? { atributos } : {}),
            ...(valor.operaciones !== undefined ? { operaciones } : {}),
            ...(typeof valor.persistente === 'boolean'
              ? { persistente: valor.persistente }
              : {}),
            ...(atributoIdentificador !== undefined
              ? { atributoIdentificador }
              : {}),
          }
        : null;
    }

    case 'RENOMBRAR_CLASE': {
      const clase = leerReferencia(valor.clase, `${campo}.clase`, errores);
      const nuevoNombre = exigirTexto(
        valor.nuevoNombre,
        `${campo}.nuevoNombre`,
        errores,
      );
      return clase && nuevoNombre ? { tipo, clase, nuevoNombre } : null;
    }

    case 'AGREGAR_ATRIBUTO': {
      const clase = leerReferencia(valor.clase, `${campo}.clase`, errores);
      const atributo = leerAtributo(
        valor.atributo,
        `${campo}.atributo`,
        errores,
      );
      return clase && atributo ? { tipo, clase, atributo } : null;
    }

    case 'MODIFICAR_ATRIBUTO': {
      const clase = leerReferencia(valor.clase, `${campo}.clase`, errores);
      const atributo = leerReferencia(
        valor.atributo,
        `${campo}.atributo`,
        errores,
      ) as ReferenciaAtributoAsistente | null;
      if (!esObjeto(valor.cambios)) {
        errores.push(`${campo}.cambios debe ser un objeto`);
        return null;
      }

      const cambios: Partial<DefinicionAtributoAsistente> = {};
      if (valor.cambios.nombre !== undefined) {
        const nombre = exigirTexto(
          valor.cambios.nombre,
          `${campo}.cambios.nombre`,
          errores,
        );
        if (nombre) cambios.nombre = nombre;
      }
      if (valor.cambios.tipo !== undefined) {
        const tipoAtributo = exigirTexto(
          valor.cambios.tipo,
          `${campo}.cambios.tipo`,
          errores,
        );
        if (tipoAtributo) cambios.tipo = tipoAtributo;
      }
      const visibilidad = leerVisibilidad(
        valor.cambios.visibilidad,
        `${campo}.cambios.visibilidad`,
        errores,
      );
      if (visibilidad) cambios.visibilidad = visibilidad;
      if (Object.keys(cambios).length === 0) {
        errores.push(`${campo}.cambios debe incluir al menos un cambio`);
      }

      return clase && atributo && Object.keys(cambios).length > 0
        ? { tipo, clase, atributo, cambios }
        : null;
    }

    case 'AGREGAR_OPERACION': {
      const clase = leerReferencia(valor.clase, `${campo}.clase`, errores);
      const operacion = leerOperacion(
        valor.operacion,
        `${campo}.operacion`,
        errores,
      );
      return clase && operacion ? { tipo, clase, operacion } : null;
    }

    case 'CREAR_RELACION': {
      const origen = leerReferencia(valor.origen, `${campo}.origen`, errores);
      const destino = leerReferencia(valor.destino, `${campo}.destino`, errores);
      const tipoRelacion =
        typeof valor.tipoRelacion === 'string' &&
        TIPOS_RELACION.has(valor.tipoRelacion as TipoRelacionUml)
          ? (valor.tipoRelacion as TipoRelacionUml)
          : null;
      if (!tipoRelacion) {
        errores.push(`${campo}.tipoRelacion no es un tipo de relación soportado`);
      }
      const nombre = leerTextoOpcional(valor.nombre, `${campo}.nombre`, errores);
      const multiplicidadOrigen = leerMultiplicidad(
        valor.multiplicidadOrigen,
        `${campo}.multiplicidadOrigen`,
        errores,
      );
      const multiplicidadDestino = leerMultiplicidad(
        valor.multiplicidadDestino,
        `${campo}.multiplicidadDestino`,
        errores,
      );

      return origen && destino && tipoRelacion
        ? {
            tipo,
            origen,
            destino,
            tipoRelacion,
            ...(nombre !== undefined ? { nombre } : {}),
            ...(multiplicidadOrigen !== undefined
              ? { multiplicidadOrigen }
              : {}),
            ...(multiplicidadDestino !== undefined
              ? { multiplicidadDestino }
              : {}),
          }
        : null;
    }

    case 'CONFIGURAR_PERSISTENCIA': {
      const clase = leerReferencia(valor.clase, `${campo}.clase`, errores);
      if (typeof valor.persistente !== 'boolean') {
        errores.push(`${campo}.persistente debe ser booleano`);
      }
      let atributoIdentificador: ReferenciaAtributoAsistente | null | undefined;
      if (valor.atributoIdentificador === null) {
        atributoIdentificador = null;
      } else if (valor.atributoIdentificador !== undefined) {
        atributoIdentificador = leerReferencia(
          valor.atributoIdentificador,
          `${campo}.atributoIdentificador`,
          errores,
        ) as ReferenciaAtributoAsistente | null;
      }

      return clase && typeof valor.persistente === 'boolean'
        ? {
            tipo,
            clase,
            persistente: valor.persistente,
            ...(atributoIdentificador !== undefined
              ? { atributoIdentificador }
              : {}),
          }
        : null;
    }

    default:
      errores.push(`${campo}.tipo no corresponde a una acción soportada`);
      return null;
  }
}

export function validarIntencionAsistente(valor: unknown): ResultadoValidacionIntencion {
  const errores: string[] = [];
  if (!esObjeto(valor)) {
    return {
      valida: false,
      intencion: null,
      errores: ['La intención debe ser un objeto JSON'],
    };
  }
  if (valor.version !== 1) errores.push('version debe ser 1');

  if (valor.estado === 'FALTAN_DATOS') {
    const pregunta = exigirTexto(valor.pregunta, 'pregunta', errores);
    const datosFaltantes = Array.isArray(valor.datosFaltantes)
      ? valor.datosFaltantes
          .map((dato, indice) =>
            exigirTexto(dato, `datosFaltantes[${indice}]`, errores),
          )
          .filter((dato): dato is string => dato !== null)
      : [];
    if (!Array.isArray(valor.datosFaltantes) || datosFaltantes.length === 0) {
      errores.push('datosFaltantes debe contener al menos un elemento');
    }
    return {
      valida: errores.length === 0,
      intencion:
        errores.length === 0 && pregunta
          ? { version: 1, estado: 'FALTAN_DATOS', pregunta, datosFaltantes }
          : null,
      errores,
    };
  }

  if (valor.estado === 'NO_SOPORTADA') {
    const motivo = exigirTexto(valor.motivo, 'motivo', errores);
    return {
      valida: errores.length === 0,
      intencion:
        errores.length === 0 && motivo
          ? { version: 1, estado: 'NO_SOPORTADA', motivo }
          : null,
      errores,
    };
  }

  if (valor.estado !== 'LISTA') {
    errores.push('estado debe ser LISTA, FALTAN_DATOS o NO_SOPORTADA');
    return { valida: false, intencion: null, errores };
  }

  if (!Array.isArray(valor.acciones) || valor.acciones.length === 0) {
    errores.push('acciones debe contener al menos una acción');
    return { valida: false, intencion: null, errores };
  }

  const acciones: AccionAsistente[] = [];
  valor.acciones.forEach((accion, indice) => {
    const parseada = leerAccion(accion, indice, errores);
    if (parseada) acciones.push(parseada);
  });

  return {
    valida: errores.length === 0,
    intencion:
      errores.length === 0
        ? { version: 1, estado: 'LISTA', acciones }
        : null,
    errores,
  };
}

export function validarJsonIntencionAsistente(
  textoJson: string,
): ResultadoValidacionIntencion {
  try {
    return validarIntencionAsistente(JSON.parse(textoJson) as unknown);
  } catch {
    return {
      valida: false,
      intencion: null,
      errores: ['La respuesta del asistente no contiene JSON válido'],
    };
  }
}
