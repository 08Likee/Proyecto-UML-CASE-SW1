import type {
  ClaseUml,
  ModeloUml,
  MultiplicidadUml,
  OperacionUml,
  RelacionUml,
} from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import type {
  OperacionPendienteGeneracion,
  ProblemaValidacionGeneracion,
  ResultadoValidacionGeneracion,
} from '../models/generacion-backend';

const TIPOS_SOPORTADOS = new Set([
  'String',
  'Int',
  'Integer',
  'Long',
  'Double',
  'Float',
  'Decimal',
  'Boolean',
  'Date',
  'DateTime',
  'UUID',
]);

const TIPOS_ID_SOPORTADOS = new Set([
  'String',
  'Int',
  'Integer',
  'Long',
  'UUID',
]);

const IDENTIFICADOR_JAVA = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function validarModeloParaGeneracion(
  modelo: ModeloUml,
): ResultadoValidacionGeneracion {
  const errores: ProblemaValidacionGeneracion[] = [];
  const advertencias: ProblemaValidacionGeneracion[] = [];
  const operacionesPendientes: OperacionPendienteGeneracion[] = [];
  const clases = modelo.contenido.clases;

  if (clases.length === 0) {
    errores.push(
      problema('MODELO_SIN_CLASES', null, 'El modelo no contiene clases'),
    );
  }

  const nombresClases = new Set<string>();
  for (const clase of clases) {
    validarClase(clase, nombresClases, errores, operacionesPendientes);
  }

  const clasesPersistentes = clases.filter(
    (clase) => clase.persistencia.persistente,
  );

  if (clasesPersistentes.length === 0) {
    errores.push(
      problema(
        'SIN_CLASES_PERSISTENTES',
        null,
        'Debe existir al menos una clase persistente para generar el backend',
      ),
    );
  }

  const porId = new Map(clases.map((clase) => [clase.id, clase]));
  for (const relacion of modelo.contenido.relaciones) {
    validarRelacion(relacion, porId, errores, advertencias);
  }
  validarCamposRelacionesGeneradas(modelo.contenido.relaciones, porId, errores);

  return {
    valido: errores.length === 0,
    errores,
    advertencias,
    operacionesPendientes,
  };
}

function validarClase(
  clase: ClaseUml,
  nombresClases: Set<string>,
  errores: ProblemaValidacionGeneracion[],
  operacionesPendientes: OperacionPendienteGeneracion[],
): void {
  if (!IDENTIFICADOR_JAVA.test(clase.nombre)) {
    errores.push(
      problema(
        'NOMBRE_CLASE_INVALIDO',
        clase.nombre,
        `El nombre de clase "${clase.nombre}" no es un identificador Java válido`,
      ),
    );
  }

  if (nombresClases.has(clase.nombre)) {
    errores.push(
      problema(
        'CLASE_DUPLICADA',
        clase.nombre,
        `Existe más de una clase llamada "${clase.nombre}"`,
      ),
    );
  }
  nombresClases.add(clase.nombre);

  const nombresAtributos = new Set<string>();
  for (const atributo of clase.atributos) {
    const elemento = `${clase.nombre}.${atributo.nombre}`;
    if (!IDENTIFICADOR_JAVA.test(atributo.nombre)) {
      errores.push(
        problema(
          'NOMBRE_ATRIBUTO_INVALIDO',
          elemento,
          `El atributo "${elemento}" no posee un nombre Java válido`,
        ),
      );
    }

    if (nombresAtributos.has(atributo.nombre)) {
      errores.push(
        problema(
          'ATRIBUTO_DUPLICADO',
          elemento,
          `La clase "${clase.nombre}" contiene atributos duplicados llamados "${atributo.nombre}"`,
        ),
      );
    }
    nombresAtributos.add(atributo.nombre);

    if (!TIPOS_SOPORTADOS.has(atributo.tipo)) {
      errores.push(
        problema(
          'TIPO_NO_SOPORTADO',
          elemento,
          `El tipo "${atributo.tipo}" no pertenece al subconjunto soportado por el generador`,
        ),
      );
    }
  }

  for (const operacion of clase.operaciones) {
    validarOperacion(clase, operacion, errores, operacionesPendientes);
  }

  if (!clase.persistencia.persistente) {
    return;
  }

  if (!clase.persistencia.idAtributoIdentificador) {
    errores.push(
      problema(
        'IDENTIFICADOR_FALTANTE',
        clase.nombre,
        `La clase persistente "${clase.nombre}" debe definir un atributo identificador`,
      ),
    );
    return;
  }

  const identificador = clase.atributos.find(
    (atributo) => atributo.id === clase.persistencia.idAtributoIdentificador,
  );

  if (!identificador) {
    errores.push(
      problema(
        'IDENTIFICADOR_INEXISTENTE',
        clase.nombre,
        `El identificador configurado para "${clase.nombre}" no pertenece a la clase`,
      ),
    );
    return;
  }

  if (!TIPOS_ID_SOPORTADOS.has(identificador.tipo)) {
    errores.push(
      problema(
        'TIPO_IDENTIFICADOR_NO_SOPORTADO',
        `${clase.nombre}.${identificador.nombre}`,
        `El tipo "${identificador.tipo}" no está soportado como identificador`,
      ),
    );
  }
}

function validarOperacion(
  clase: ClaseUml,
  operacion: OperacionUml,
  errores: ProblemaValidacionGeneracion[],
  operacionesPendientes: OperacionPendienteGeneracion[],
): void {
  const elemento = `${clase.nombre}.${operacion.nombre}`;
  if (!IDENTIFICADOR_JAVA.test(operacion.nombre)) {
    errores.push(
      problema(
        'NOMBRE_OPERACION_INVALIDO',
        elemento,
        `La operación "${elemento}" no posee un nombre Java válido`,
      ),
    );
  }

  for (const parametro of operacion.parametros) {
    if (!IDENTIFICADOR_JAVA.test(parametro.nombre)) {
      errores.push(
        problema(
          'NOMBRE_PARAMETRO_INVALIDO',
          `${elemento}.${parametro.nombre}`,
          `El parámetro "${parametro.nombre}" no posee un nombre Java válido`,
        ),
      );
    }
    if (!TIPOS_SOPORTADOS.has(parametro.tipo)) {
      errores.push(
        problema(
          'TIPO_PARAMETRO_NO_SOPORTADO',
          `${elemento}.${parametro.nombre}`,
          `El tipo de parámetro "${parametro.tipo}" no está soportado por el generador`,
        ),
      );
    }
  }

  if (operacion.tipoRetorno && !TIPOS_SOPORTADOS.has(operacion.tipoRetorno)) {
    errores.push(
      problema(
        'TIPO_RETORNO_NO_SOPORTADO',
        elemento,
        `El tipo de retorno "${operacion.tipoRetorno}" no está soportado por el generador`,
      ),
    );
  }

  operacionesPendientes.push({
    clase: clase.nombre,
    operacion: operacion.nombre,
    firma: firmaOperacion(operacion),
    motivo:
      'La firma no contiene una regla de negocio suficiente para generar una implementación determinista',
  });
}

function validarRelacion(
  relacion: RelacionUml,
  porId: Map<string, ClaseUml>,
  errores: ProblemaValidacionGeneracion[],
  advertencias: ProblemaValidacionGeneracion[],
): void {
  const origen = porId.get(relacion.idClaseOrigen);
  const destino = porId.get(relacion.idClaseDestino);
  if (!origen || !destino) {
    return;
  }

  const participaPersistente =
    origen.persistencia.persistente || destino.persistencia.persistente;
  if (!participaPersistente) {
    return;
  }

  if (origen.persistencia.persistente !== destino.persistencia.persistente) {
    errores.push(
      problema(
        'RELACION_PERSISTENCIA_INCOMPATIBLE',
        `${origen.nombre}-${destino.nombre}`,
        'Una relación JPA no puede vincular una clase persistente con otra no persistente',
      ),
    );
    return;
  }

  if (relacion.tipo === 'GENERALIZACION') {
    errores.push(
      problema(
        'GENERALIZACION_NO_SOPORTADA',
        `${origen.nombre}-${destino.nombre}`,
        'La estrategia de herencia JPA no está definida para generalizaciones persistentes',
      ),
    );
    return;
  }

  if (!relacion.multiplicidadOrigen || !relacion.multiplicidadDestino) {
    errores.push(
      problema(
        'MULTIPLICIDAD_FALTANTE',
        `${origen.nombre}-${destino.nombre}`,
        'Las relaciones entre clases persistentes deben definir multiplicidad en ambos extremos',
      ),
    );
    return;
  }

  if (
    relacion.multiplicidadOrigen === '1..*' ||
    relacion.multiplicidadDestino === '1..*'
  ) {
    advertencias.push(
      advertencia(
        'MULTIPLICIDAD_MINIMA_NO_FORZADA',
        `${origen.nombre}-${destino.nombre}`,
        'JPA representará la cardinalidad múltiple, pero la cota mínima 1 requiere validación adicional de negocio',
      ),
    );
  }

  if (
    esMuchos(relacion.multiplicidadOrigen) &&
    esMuchos(relacion.multiplicidadDestino)
  ) {
    advertencias.push(
      advertencia(
        'MANY_TO_MANY_TABLA_UNION',
        `${origen.nombre}-${destino.nombre}`,
        'La relación muchos a muchos se materializará como tabla de unión administrada por JPA. Si necesita atributos o CRUD independiente para esa tabla, modele una clase asociativa persistente',
      ),
    );
  }
}

function validarCamposRelacionesGeneradas(
  relaciones: RelacionUml[],
  porId: Map<string, ClaseUml>,
  errores: ProblemaValidacionGeneracion[],
): void {
  const camposPorClase = new Map<string, Set<string>>();

  for (const relacion of relaciones) {
    if (
      relacion.tipo === 'GENERALIZACION' ||
      !relacion.multiplicidadOrigen ||
      !relacion.multiplicidadDestino
    ) {
      continue;
    }

    const origen = porId.get(relacion.idClaseOrigen);
    const destino = porId.get(relacion.idClaseDestino);
    if (
      !origen?.persistencia.persistente ||
      !destino?.persistencia.persistente
    ) {
      continue;
    }

    const origenMuchos = esMuchos(relacion.multiplicidadOrigen);
    const destinoMuchos = esMuchos(relacion.multiplicidadDestino);
    const propietario = !origenMuchos && destinoMuchos ? destino : origen;
    const entidadDestino = !origenMuchos && destinoMuchos ? origen : destino;
    const usarNombreExplicito =
      origenMuchos === destinoMuchos &&
      relacion.nombre &&
      IDENTIFICADOR_JAVA.test(relacion.nombre);
    const nombreCampo = usarNombreExplicito
      ? relacion.nombre!
      : minusculaInicial(entidadDestino.nombre);
    const esColeccion = origenMuchos && destinoMuchos;
    const nombreCampoDto = `${nombreCampo}${esColeccion ? 'Ids' : 'Id'}`;
    const atributos = new Set(
      propietario.atributos.map((atributo) => atributo.nombre),
    );

    if (atributos.has(nombreCampo)) {
      errores.push(
        problema(
          'RELACION_COLISION_ATRIBUTO',
          `${propietario.nombre}.${nombreCampo}`,
          `La relación generaría el campo "${nombreCampo}", que ya existe como atributo en "${propietario.nombre}"`,
        ),
      );
    }
    if (atributos.has(nombreCampoDto)) {
      errores.push(
        problema(
          'RELACION_COLISION_DTO',
          `${propietario.nombre}.${nombreCampoDto}`,
          `No agregue manualmente "${nombreCampoDto}": el generador lo deriva de la relación UML`,
        ),
      );
    }

    const usados = camposPorClase.get(propietario.id) ?? new Set<string>();
    if (usados.has(nombreCampo)) {
      errores.push(
        problema(
          'RELACION_CAMPO_DUPLICADO',
          `${propietario.nombre}.${nombreCampo}`,
          `Más de una relación generaría el campo "${nombreCampo}" en "${propietario.nombre}"; asigne nombres de relación distintos`,
        ),
      );
    }
    usados.add(nombreCampo);
    camposPorClase.set(propietario.id, usados);
  }
}

function minusculaInicial(valor: string): string {
  return valor.charAt(0).toLowerCase() + valor.slice(1);
}

function firmaOperacion(operacion: OperacionUml): string {
  const parametros = operacion.parametros
    .map((parametro) => `${parametro.nombre}: ${parametro.tipo}`)
    .join(', ');
  return `${operacion.nombre}(${parametros}): ${operacion.tipoRetorno ?? 'void'}`;
}

export function esMuchos(multiplicidad: MultiplicidadUml): boolean {
  return (
    multiplicidad === '*' ||
    multiplicidad === '0..*' ||
    multiplicidad === '1..*'
  );
}

function problema(
  codigo: string,
  elemento: string | null,
  mensaje: string,
): ProblemaValidacionGeneracion {
  return { codigo, severidad: 'ERROR', elemento, mensaje };
}

function advertencia(
  codigo: string,
  elemento: string | null,
  mensaje: string,
): ProblemaValidacionGeneracion {
  return { codigo, severidad: 'ADVERTENCIA', elemento, mensaje };
}
