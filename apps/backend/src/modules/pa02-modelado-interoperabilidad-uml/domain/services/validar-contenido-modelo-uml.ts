import { ModeloUmlInvalidoError } from '../errors/modelo-uml-invalido.error';
import {
  type ClaseUml,
  type ModeloUmlContenido,
  type MultiplicidadUml,
  type RelacionUml,
  type TipoRelacionUml,
  type VisibilidadUml,
} from '../models/modelo-uml';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function fallar(campo: string, mensaje: string): never {
  throw new ModeloUmlInvalidoError(mensaje, campo);
}

function exigirObjeto(valor: unknown, campo: string): Record<string, unknown> {
  if (!esObjeto(valor)) {
    fallar(campo, `${campo} debe ser un objeto`);
  }

  return valor;
}

function exigirArreglo(valor: unknown, campo: string): unknown[] {
  if (!Array.isArray(valor)) {
    fallar(campo, `${campo} debe ser un arreglo`);
  }

  return valor;
}

function exigirTexto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    fallar(campo, `${campo} debe contener texto`);
  }

  return valor;
}

function exigirUuid(valor: unknown, campo: string): string {
  const texto = exigirTexto(valor, campo);

  if (!UUID_PATTERN.test(texto)) {
    fallar(campo, `${campo} debe ser un UUID válido`);
  }

  return texto;
}

function exigirNumeroFinito(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    fallar(campo, `${campo} debe ser un número finito`);
  }

  return valor;
}

function exigirBoolean(valor: unknown, campo: string): boolean {
  if (typeof valor !== 'boolean') {
    fallar(campo, `${campo} debe ser booleano`);
  }

  return valor;
}

function exigirVisibilidad(valor: unknown, campo: string): VisibilidadUml {
  if (
    typeof valor !== 'string' ||
    !VISIBILIDADES.has(valor as VisibilidadUml)
  ) {
    fallar(campo, `${campo} debe ser PUBLICA, PRIVADA, PROTEGIDA o PAQUETE`);
  }

  return valor as VisibilidadUml;
}

function exigirMultiplicidad(valor: unknown, campo: string): MultiplicidadUml {
  if (
    typeof valor !== 'string' ||
    !MULTIPLICIDADES.has(valor as MultiplicidadUml)
  ) {
    fallar(campo, `${campo} debe ser 1, 0..1, *, 0..* o 1..*`);
  }

  return valor as MultiplicidadUml;
}

function registrarId(id: string, campo: string, ids: Set<string>): void {
  if (ids.has(id)) {
    fallar(campo, `El identificador ${id} está repetido dentro del modelo`);
  }

  ids.add(id);
}

function validarClase(
  valor: unknown,
  indice: number,
  ids: Set<string>,
): ClaseUml {
  const base = `clases[${indice}]`;
  const clase = exigirObjeto(valor, base);

  const id = exigirUuid(clase.id, `${base}.id`);
  registrarId(id, `${base}.id`, ids);

  exigirTexto(clase.nombre, `${base}.nombre`);

  const posicion = exigirObjeto(clase.posicion, `${base}.posicion`);
  exigirNumeroFinito(posicion.x, `${base}.posicion.x`);
  exigirNumeroFinito(posicion.y, `${base}.posicion.y`);

  const atributos = exigirArreglo(clase.atributos, `${base}.atributos`);
  const idsAtributos = new Set<string>();

  for (const [indiceAtributo, valorAtributo] of atributos.entries()) {
    const campoAtributo = `${base}.atributos[${indiceAtributo}]`;
    const atributo = exigirObjeto(valorAtributo, campoAtributo);
    const idAtributo = exigirUuid(atributo.id, `${campoAtributo}.id`);

    registrarId(idAtributo, `${campoAtributo}.id`, ids);
    idsAtributos.add(idAtributo);

    exigirTexto(atributo.nombre, `${campoAtributo}.nombre`);
    exigirTexto(atributo.tipo, `${campoAtributo}.tipo`);
    exigirVisibilidad(atributo.visibilidad, `${campoAtributo}.visibilidad`);
  }

  const operaciones = exigirArreglo(clase.operaciones, `${base}.operaciones`);

  for (const [indiceOperacion, valorOperacion] of operaciones.entries()) {
    const campoOperacion = `${base}.operaciones[${indiceOperacion}]`;
    const operacion = exigirObjeto(valorOperacion, campoOperacion);
    const idOperacion = exigirUuid(operacion.id, `${campoOperacion}.id`);

    registrarId(idOperacion, `${campoOperacion}.id`, ids);
    exigirTexto(operacion.nombre, `${campoOperacion}.nombre`);
    exigirVisibilidad(operacion.visibilidad, `${campoOperacion}.visibilidad`);

    const parametros = exigirArreglo(
      operacion.parametros,
      `${campoOperacion}.parametros`,
    );

    for (const [indiceParametro, valorParametro] of parametros.entries()) {
      const campoParametro = `${campoOperacion}.parametros[${indiceParametro}]`;
      const parametro = exigirObjeto(valorParametro, campoParametro);
      const idParametro = exigirUuid(parametro.id, `${campoParametro}.id`);

      registrarId(idParametro, `${campoParametro}.id`, ids);
      exigirTexto(parametro.nombre, `${campoParametro}.nombre`);
      exigirTexto(parametro.tipo, `${campoParametro}.tipo`);
    }

    if (
      operacion.tipoRetorno !== null &&
      (typeof operacion.tipoRetorno !== 'string' ||
        operacion.tipoRetorno.trim().length === 0)
    ) {
      fallar(
        `${campoOperacion}.tipoRetorno`,
        `${campoOperacion}.tipoRetorno debe ser texto o null`,
      );
    }
  }

  const persistencia = exigirObjeto(clase.persistencia, `${base}.persistencia`);
  const persistente = exigirBoolean(
    persistencia.persistente,
    `${base}.persistencia.persistente`,
  );

  const idAtributoIdentificador = persistencia.idAtributoIdentificador;

  if (idAtributoIdentificador !== null) {
    const idIdentificador = exigirUuid(
      idAtributoIdentificador,
      `${base}.persistencia.idAtributoIdentificador`,
    );

    if (!idsAtributos.has(idIdentificador)) {
      fallar(
        `${base}.persistencia.idAtributoIdentificador`,
        'El atributo identificador debe pertenecer a la misma clase',
      );
    }
  }

  if (!persistente && idAtributoIdentificador !== null) {
    fallar(
      `${base}.persistencia.idAtributoIdentificador`,
      'Una clase no persistente no puede conservar un atributo identificador',
    );
  }

  return clase as unknown as ClaseUml;
}

function validarRelacion(
  valor: unknown,
  indice: number,
  ids: Set<string>,
  idsClases: Set<string>,
): RelacionUml {
  const base = `relaciones[${indice}]`;
  const relacion = exigirObjeto(valor, base);

  const id = exigirUuid(relacion.id, `${base}.id`);
  registrarId(id, `${base}.id`, ids);

  if (
    typeof relacion.tipo !== 'string' ||
    !TIPOS_RELACION.has(relacion.tipo as TipoRelacionUml)
  ) {
    fallar(
      `${base}.tipo`,
      `${base}.tipo debe ser ASOCIACION, GENERALIZACION, AGREGACION o COMPOSICION`,
    );
  }

  const tipo = relacion.tipo as TipoRelacionUml;
  const idClaseOrigen = exigirUuid(
    relacion.idClaseOrigen,
    `${base}.idClaseOrigen`,
  );
  const idClaseDestino = exigirUuid(
    relacion.idClaseDestino,
    `${base}.idClaseDestino`,
  );

  if (!idsClases.has(idClaseOrigen) || !idsClases.has(idClaseDestino)) {
    fallar(
      base,
      'Toda relación debe referenciar clases existentes dentro del modelo',
    );
  }

  if (relacion.nombre !== null) {
    exigirTexto(relacion.nombre, `${base}.nombre`);
  }

  if (tipo === 'GENERALIZACION') {
    if (
      relacion.multiplicidadOrigen !== null ||
      relacion.multiplicidadDestino !== null
    ) {
      fallar(
        base,
        'La generalización no utiliza multiplicidades en el subconjunto soportado',
      );
    }
  } else {
    exigirMultiplicidad(
      relacion.multiplicidadOrigen,
      `${base}.multiplicidadOrigen`,
    );
    exigirMultiplicidad(
      relacion.multiplicidadDestino,
      `${base}.multiplicidadDestino`,
    );
  }

  return relacion as unknown as RelacionUml;
}

export function validarContenidoModeloUml(valor: unknown): ModeloUmlContenido {
  const contenido = exigirObjeto(valor, 'contenido');

  if (contenido.versionEsquema !== 1) {
    fallar('contenido.versionEsquema', 'contenido.versionEsquema debe ser 1');
  }

  exigirObjeto(contenido.configuracion, 'contenido.configuracion');

  const valoresClases = exigirArreglo(contenido.clases, 'contenido.clases');
  const valoresRelaciones = exigirArreglo(
    contenido.relaciones,
    'contenido.relaciones',
  );

  const ids = new Set<string>();
  const clases = valoresClases.map((clase, indice) =>
    validarClase(clase, indice, ids),
  );
  const idsClases = new Set(clases.map((clase) => clase.id));

  valoresRelaciones.forEach((relacion, indice) =>
    validarRelacion(relacion, indice, ids, idsClases),
  );

  return contenido as unknown as ModeloUmlContenido;
}
