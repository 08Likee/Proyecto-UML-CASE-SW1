import type {
  AtributoUml,
  ClaseUml,
  ModeloUmlContenido,
  OperacionUml,
  ParametroUml,
  RelacionUml,
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

export type SeleccionAsistente =
  | { tipo: 'CLASE'; id: string }
  | { tipo: 'RELACION'; id: string }
  | null;

export type ResultadoEjecucionAsistente =
  | {
      exito: true;
      contenido: ModeloUmlContenido;
      seleccion: SeleccionAsistente;
      accionesAplicadas: string[];
    }
  | {
      exito: false;
      codigo: string;
      mensaje: string;
      indiceAccion: number | null;
    };

class ErrorEjecucionAsistente extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

function normalizar(valor: string): string {
  return valor.trim().toLocaleLowerCase('es');
}

function posicionNuevaClase(indice: number): { x: number; y: number } {
  return {
    x: 80 + (indice % 3) * 360,
    y: 80 + Math.floor(indice / 3) * 240,
  };
}

function crearAtributo(definicion: DefinicionAtributoAsistente): AtributoUml {
  return {
    id: crypto.randomUUID(),
    nombre: definicion.nombre.trim(),
    tipo: definicion.tipo.trim(),
    visibilidad: definicion.visibilidad ?? 'PRIVADA',
  };
}

function crearParametro(definicion: DefinicionParametroAsistente): ParametroUml {
  return {
    id: crypto.randomUUID(),
    nombre: definicion.nombre.trim(),
    tipo: definicion.tipo.trim(),
  };
}

function crearOperacion(definicion: DefinicionOperacionAsistente): OperacionUml {
  const parametros = (definicion.parametros ?? []).map(crearParametro);
  const nombres = new Set<string>();
  for (const parametro of parametros) {
    const nombre = normalizar(parametro.nombre);
    if (nombres.has(nombre)) {
      throw new ErrorEjecucionAsistente(
        'PARAMETRO_DUPLICADO',
        `La operación ${definicion.nombre} contiene el parámetro ${parametro.nombre} más de una vez.`,
      );
    }
    nombres.add(nombre);
  }

  return {
    id: crypto.randomUUID(),
    nombre: definicion.nombre.trim(),
    visibilidad: definicion.visibilidad ?? 'PUBLICA',
    parametros,
    tipoRetorno: definicion.tipoRetorno?.trim() || null,
  };
}

function resolverClase(
  contenido: ModeloUmlContenido,
  referencia: ReferenciaClaseAsistente,
): ClaseUml {
  if (referencia.id) {
    const clase = contenido.clases.find((item) => item.id === referencia.id);
    if (clase) return clase;
    throw new ErrorEjecucionAsistente(
      'CLASE_NO_ENCONTRADA',
      `No existe una clase con id ${referencia.id}.`,
    );
  }

  const nombre = referencia.nombre?.trim();
  const coincidencias = nombre
    ? contenido.clases.filter(
        (clase) => normalizar(clase.nombre) === normalizar(nombre),
      )
    : [];

  if (coincidencias.length === 1) return coincidencias[0];
  if (coincidencias.length > 1) {
    throw new ErrorEjecucionAsistente(
      'CLASE_AMBIGUA',
      `Existen varias clases llamadas ${nombre}.`,
    );
  }
  throw new ErrorEjecucionAsistente(
    'CLASE_NO_ENCONTRADA',
    `No existe la clase ${nombre ?? 'solicitada'}.`,
  );
}

function resolverAtributo(
  clase: ClaseUml,
  referencia: ReferenciaAtributoAsistente,
): AtributoUml {
  if (referencia.id) {
    const atributo = clase.atributos.find((item) => item.id === referencia.id);
    if (atributo) return atributo;
  } else if (referencia.nombre) {
    const coincidencias = clase.atributos.filter(
      (atributo) =>
        normalizar(atributo.nombre) === normalizar(referencia.nombre!),
    );
    if (coincidencias.length === 1) return coincidencias[0];
    if (coincidencias.length > 1) {
      throw new ErrorEjecucionAsistente(
        'ATRIBUTO_AMBIGUO',
        `La clase ${clase.nombre} contiene varios atributos llamados ${referencia.nombre}.`,
      );
    }
  }

  throw new ErrorEjecucionAsistente(
    'ATRIBUTO_NO_ENCONTRADO',
    `No se encontró el atributo solicitado en ${clase.nombre}.`,
  );
}

function asegurarNombreClaseDisponible(
  contenido: ModeloUmlContenido,
  nombre: string,
  idIgnorado?: string,
): void {
  if (
    contenido.clases.some(
      (clase) =>
        clase.id !== idIgnorado && normalizar(clase.nombre) === normalizar(nombre),
    )
  ) {
    throw new ErrorEjecucionAsistente(
      'CLASE_DUPLICADA',
      `Ya existe una clase llamada ${nombre}.`,
    );
  }
}

function asegurarNombreAtributoDisponible(
  clase: ClaseUml,
  nombre: string,
  idIgnorado?: string,
): void {
  if (
    clase.atributos.some(
      (atributo) =>
        atributo.id !== idIgnorado &&
        normalizar(atributo.nombre) === normalizar(nombre),
    )
  ) {
    throw new ErrorEjecucionAsistente(
      'ATRIBUTO_DUPLICADO',
      `La clase ${clase.nombre} ya contiene un atributo llamado ${nombre}.`,
    );
  }
}

function validarRelacion(relacion: RelacionUml): void {
  if (relacion.tipo === 'GENERALIZACION') {
    if (
      relacion.multiplicidadOrigen !== null ||
      relacion.multiplicidadDestino !== null
    ) {
      throw new ErrorEjecucionAsistente(
        'MULTIPLICIDAD_GENERALIZACION',
        'La generalización no utiliza multiplicidades.',
      );
    }
    return;
  }

  if (!relacion.multiplicidadOrigen || !relacion.multiplicidadDestino) {
    throw new ErrorEjecucionAsistente(
      'MULTIPLICIDAD_FALTANTE',
      `La relación ${relacion.tipo} necesita multiplicidad en ambos extremos.`,
    );
  }
}

function aplicarAccion(
  contenido: ModeloUmlContenido,
  accion: AccionAsistente,
): { seleccion: SeleccionAsistente; resumen: string } {
  switch (accion.tipo) {
    case 'CREAR_CLASE': {
      asegurarNombreClaseDisponible(contenido, accion.nombre);
      const atributos = (accion.atributos ?? []).map(crearAtributo);
      const nombresAtributos = new Set<string>();
      for (const atributo of atributos) {
        const nombre = normalizar(atributo.nombre);
        if (nombresAtributos.has(nombre)) {
          throw new ErrorEjecucionAsistente(
            'ATRIBUTO_DUPLICADO',
            `La nueva clase contiene el atributo ${atributo.nombre} más de una vez.`,
          );
        }
        nombresAtributos.add(nombre);
      }

      const persistente = accion.persistente ?? false;
      let idAtributoIdentificador: string | null = null;
      if (accion.atributoIdentificador) {
        if (!persistente) {
          throw new ErrorEjecucionAsistente(
            'PERSISTENCIA_INCONSISTENTE',
            'No puede definirse identificador en una clase no persistente.',
          );
        }
        const atributo = atributos.find(
          (item) =>
            normalizar(item.nombre) === normalizar(accion.atributoIdentificador!),
        );
        if (!atributo) {
          throw new ErrorEjecucionAsistente(
            'IDENTIFICADOR_NO_ENCONTRADO',
            `El atributo ${accion.atributoIdentificador} no existe en la nueva clase.`,
          );
        }
        idAtributoIdentificador = atributo.id;
      }

      const clase: ClaseUml = {
        id: crypto.randomUUID(),
        nombre: accion.nombre.trim(),
        atributos,
        operaciones: (accion.operaciones ?? []).map(crearOperacion),
        posicion: posicionNuevaClase(contenido.clases.length),
        persistencia: { persistente, idAtributoIdentificador },
      };
      contenido.clases.push(clase);
      return {
        seleccion: { tipo: 'CLASE', id: clase.id },
        resumen: `Se creó la clase ${clase.nombre}.`,
      };
    }

    case 'RENOMBRAR_CLASE': {
      const clase = resolverClase(contenido, accion.clase);
      asegurarNombreClaseDisponible(contenido, accion.nuevoNombre, clase.id);
      clase.nombre = accion.nuevoNombre.trim();
      return {
        seleccion: { tipo: 'CLASE', id: clase.id },
        resumen: `Se renombró la clase a ${clase.nombre}.`,
      };
    }

    case 'AGREGAR_ATRIBUTO': {
      const clase = resolverClase(contenido, accion.clase);
      asegurarNombreAtributoDisponible(clase, accion.atributo.nombre);
      const atributo = crearAtributo(accion.atributo);
      clase.atributos.push(atributo);
      return {
        seleccion: { tipo: 'CLASE', id: clase.id },
        resumen: `Se agregó ${atributo.nombre} a ${clase.nombre}.`,
      };
    }

    case 'MODIFICAR_ATRIBUTO': {
      const clase = resolverClase(contenido, accion.clase);
      const atributo = resolverAtributo(clase, accion.atributo);
      if (accion.cambios.nombre) {
        asegurarNombreAtributoDisponible(
          clase,
          accion.cambios.nombre,
          atributo.id,
        );
        atributo.nombre = accion.cambios.nombre.trim();
      }
      if (accion.cambios.tipo) atributo.tipo = accion.cambios.tipo.trim();
      if (accion.cambios.visibilidad) {
        atributo.visibilidad = accion.cambios.visibilidad;
      }
      return {
        seleccion: { tipo: 'CLASE', id: clase.id },
        resumen: `Se modificó el atributo ${atributo.nombre} de ${clase.nombre}.`,
      };
    }

    case 'AGREGAR_OPERACION': {
      const clase = resolverClase(contenido, accion.clase);
      const operacion = crearOperacion(accion.operacion);
      clase.operaciones.push(operacion);
      return {
        seleccion: { tipo: 'CLASE', id: clase.id },
        resumen: `Se agregó la operación ${operacion.nombre} a ${clase.nombre}.`,
      };
    }

    case 'CREAR_RELACION': {
      const origen = resolverClase(contenido, accion.origen);
      const destino = resolverClase(contenido, accion.destino);
      const generalizacion = accion.tipoRelacion === 'GENERALIZACION';
      if (
        generalizacion &&
        (accion.multiplicidadOrigen != null || accion.multiplicidadDestino != null)
      ) {
        throw new ErrorEjecucionAsistente(
          'MULTIPLICIDAD_GENERALIZACION',
          'La generalización no utiliza multiplicidades.',
        );
      }
      if (
        !generalizacion &&
        (!accion.multiplicidadOrigen || !accion.multiplicidadDestino)
      ) {
        throw new ErrorEjecucionAsistente(
          'MULTIPLICIDAD_FALTANTE',
          `Faltan multiplicidades para ${accion.tipoRelacion}.`,
        );
      }

      const relacion: RelacionUml = {
        id: crypto.randomUUID(),
        tipo: accion.tipoRelacion,
        idClaseOrigen: origen.id,
        idClaseDestino: destino.id,
        nombre: accion.nombre?.trim() || null,
        multiplicidadOrigen: generalizacion
          ? null
          : accion.multiplicidadOrigen ?? null,
        multiplicidadDestino: generalizacion
          ? null
          : accion.multiplicidadDestino ?? null,
      };
      validarRelacion(relacion);
      const duplicada = contenido.relaciones.some(
        (item) =>
          item.tipo === relacion.tipo &&
          item.idClaseOrigen === relacion.idClaseOrigen &&
          item.idClaseDestino === relacion.idClaseDestino &&
          normalizar(item.nombre ?? '') === normalizar(relacion.nombre ?? ''),
      );
      if (duplicada) {
        throw new ErrorEjecucionAsistente(
          'RELACION_DUPLICADA',
          'Ya existe una relación equivalente entre esas clases.',
        );
      }
      contenido.relaciones.push(relacion);
      return {
        seleccion: { tipo: 'RELACION', id: relacion.id },
        resumen: `Se creó ${accion.tipoRelacion.toLowerCase()} de ${origen.nombre} hacia ${destino.nombre}.`,
      };
    }

    case 'CONFIGURAR_PERSISTENCIA': {
      const clase = resolverClase(contenido, accion.clase);
      if (!accion.persistente && accion.atributoIdentificador) {
        throw new ErrorEjecucionAsistente(
          'PERSISTENCIA_INCONSISTENTE',
          'Una clase no persistente no puede conservar identificador.',
        );
      }

      let idAtributoIdentificador = accion.persistente
        ? clase.persistencia.idAtributoIdentificador
        : null;
      if (accion.persistente && accion.atributoIdentificador === null) {
        idAtributoIdentificador = null;
      } else if (accion.persistente && accion.atributoIdentificador) {
        idAtributoIdentificador = resolverAtributo(
          clase,
          accion.atributoIdentificador,
        ).id;
      }
      clase.persistencia = {
        persistente: accion.persistente,
        idAtributoIdentificador,
      };
      return {
        seleccion: { tipo: 'CLASE', id: clase.id },
        resumen: accion.persistente
          ? `Se marcó ${clase.nombre} como persistente.`
          : `Se desactivó la persistencia de ${clase.nombre}.`,
      };
    }
  }
}

function validarResultado(contenido: ModeloUmlContenido): void {
  const idsClases = new Set(contenido.clases.map((clase) => clase.id));
  for (const clase of contenido.clases) {
    const identificador = clase.persistencia.idAtributoIdentificador;
    if (
      identificador &&
      !clase.atributos.some((atributo) => atributo.id === identificador)
    ) {
      throw new ErrorEjecucionAsistente(
        'IDENTIFICADOR_INVALIDO',
        `El identificador configurado en ${clase.nombre} no pertenece a la clase.`,
      );
    }
    if (!clase.persistencia.persistente && identificador !== null) {
      throw new ErrorEjecucionAsistente(
        'PERSISTENCIA_INCONSISTENTE',
        `La clase ${clase.nombre} no es persistente y conserva identificador.`,
      );
    }
  }
  for (const relacion of contenido.relaciones) {
    if (
      !idsClases.has(relacion.idClaseOrigen) ||
      !idsClases.has(relacion.idClaseDestino)
    ) {
      throw new ErrorEjecucionAsistente(
        'RELACION_INCONSISTENTE',
        'Una relación resultante referencia una clase inexistente.',
      );
    }
    validarRelacion(relacion);
  }
}

export function ejecutarIntencionSobreModelo(
  contenidoOriginal: ModeloUmlContenido,
  intencion: IntencionAsistente,
): ResultadoEjecucionAsistente {
  if (intencion.estado === 'FALTAN_DATOS') {
    return {
      exito: false,
      codigo: 'FALTAN_DATOS',
      mensaje: intencion.pregunta,
      indiceAccion: null,
    };
  }
  if (intencion.estado === 'NO_SOPORTADA') {
    return {
      exito: false,
      codigo: 'ACCION_NO_SOPORTADA',
      mensaje: intencion.motivo,
      indiceAccion: null,
    };
  }

  const contenido = structuredClone(contenidoOriginal);
  const accionesAplicadas: string[] = [];
  let seleccion: SeleccionAsistente = null;

  for (const [indice, accion] of intencion.acciones.entries()) {
    try {
      const resultado = aplicarAccion(contenido, accion);
      seleccion = resultado.seleccion;
      accionesAplicadas.push(resultado.resumen);
    } catch (error: unknown) {
      return {
        exito: false,
        codigo:
          error instanceof ErrorEjecucionAsistente
            ? error.codigo
            : 'ERROR_EJECUCION',
        mensaje:
          error instanceof Error
            ? error.message
            : 'No se pudo ejecutar la intención sobre el modelo.',
        indiceAccion: indice,
      };
    }
  }

  try {
    validarResultado(contenido);
  } catch (error: unknown) {
    return {
      exito: false,
      codigo:
        error instanceof ErrorEjecucionAsistente
          ? error.codigo
          : 'MODELO_RESULTANTE_INVALIDO',
      mensaje:
        error instanceof Error
          ? error.message
          : 'La intención produciría un modelo inconsistente.',
      indiceAccion: null,
    };
  }

  return {
    exito: true,
    contenido,
    seleccion,
    accionesAplicadas,
  };
}
