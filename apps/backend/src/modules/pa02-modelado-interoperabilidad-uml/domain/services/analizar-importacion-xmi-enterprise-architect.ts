import { randomUUID } from 'node:crypto';
import type {
  AnalisisImportacionXmi,
  ProblemaImportacionXmi,
} from '../models/importacion-xmi';
import type {
  ClaseUml,
  ModeloUmlContenido,
  MultiplicidadUml,
  RelacionUml,
  TipoRelacionUml,
  VisibilidadUml,
} from '../models/modelo-uml';

export const TAMANO_MAXIMO_XMI_BYTES = 5 * 1024 * 1024;

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}

interface ClaseTemporal {
  idExterno: string;
  clase: ClaseUml;
  nombresAtributos: Map<string, string>;
}

interface ExtremoRelacion {
  idClaseExterno: string;
  multiplicidad: MultiplicidadUml | null;
  agregacion: string;
}

const TIPOS_ELEMENTO_SOPORTADOS = new Set([
  'Package',
  'Class',
  'PrimitiveType',
  'Association',
  // Elementos estructurales de perfiles de EA; no forman parte del modelo importado.
  'Stereotype',
  'Extension',
]);

function problema(
  codigo: string,
  severidad: 'ERROR' | 'ADVERTENCIA',
  mensaje: string,
  elemento: string | null = null,
): ProblemaImportacionXmi {
  return { codigo, severidad, elemento, mensaje };
}

function localName(nombre: string): string {
  const indice = nombre.indexOf(':');
  return indice >= 0 ? nombre.slice(indice + 1) : nombre;
}

function tipoLocal(valor: string | undefined): string {
  if (!valor) return '';
  const indice = valor.indexOf(':');
  return indice >= 0 ? valor.slice(indice + 1) : valor;
}

function atributo(nodo: XmlNode, ...nombres: string[]): string | undefined {
  for (const nombre of nombres) {
    if (nodo.attrs[nombre] !== undefined) {
      return nodo.attrs[nombre];
    }
  }
  return undefined;
}

function hijos(nodo: XmlNode, nombre: string): XmlNode[] {
  return nodo.children.filter((hijo) => localName(hijo.name) === nombre);
}

function hijo(nodo: XmlNode, nombre: string): XmlNode | undefined {
  return nodo.children.find((actual) => localName(actual.name) === nombre);
}

function descendientes(nodo: XmlNode, predicado: (actual: XmlNode) => boolean): XmlNode[] {
  const resultado: XmlNode[] = [];
  const visitar = (actual: XmlNode) => {
    for (const child of actual.children) {
      if (predicado(child)) resultado.push(child);
      visitar(child);
    }
  };
  visitar(nodo);
  return resultado;
}

function decodificarEntidad(valor: string): string {
  return valor.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (coincidencia, entidad: string) => {
    if (entidad === 'amp') return '&';
    if (entidad === 'lt') return '<';
    if (entidad === 'gt') return '>';
    if (entidad === 'quot') return '"';
    if (entidad === 'apos') return "'";
    if (entidad.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(entidad.slice(2), 16));
    }
    if (entidad.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entidad.slice(1), 10));
    }
    return coincidencia;
  });
}

function parsearAtributos(fragmento: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let indice = 0;

  while (indice < fragmento.length) {
    while (/\s/.test(fragmento[indice] ?? '')) indice += 1;
    if (indice >= fragmento.length) break;

    const inicioNombre = indice;
    while (indice < fragmento.length && !/[\s=]/.test(fragmento[indice])) indice += 1;
    const nombre = fragmento.slice(inicioNombre, indice);
    while (/\s/.test(fragmento[indice] ?? '')) indice += 1;
    if (!nombre || fragmento[indice] !== '=') {
      throw new Error('Atributo XML mal formado');
    }
    indice += 1;
    while (/\s/.test(fragmento[indice] ?? '')) indice += 1;

    const comilla = fragmento[indice];
    if (comilla !== '"' && comilla !== "'") {
      throw new Error('Los atributos XML deben estar delimitados por comillas');
    }
    indice += 1;
    const inicioValor = indice;
    while (indice < fragmento.length && fragmento[indice] !== comilla) indice += 1;
    if (indice >= fragmento.length) throw new Error('Atributo XML sin cierre');
    attrs[nombre] = decodificarEntidad(fragmento.slice(inicioValor, indice));
    indice += 1;
  }

  return attrs;
}

function encontrarCierreEtiqueta(xml: string, inicio: number): number {
  let comilla: string | null = null;
  for (let indice = inicio; indice < xml.length; indice += 1) {
    const caracter = xml[indice];
    if (comilla) {
      if (caracter === comilla) comilla = null;
      continue;
    }
    if (caracter === '"' || caracter === "'") {
      comilla = caracter;
    } else if (caracter === '>') {
      return indice;
    }
  }
  return -1;
}

function parsearXml(xml: string): XmlNode {
  const pila: XmlNode[] = [];
  let raiz: XmlNode | null = null;
  let indice = 0;

  while (indice < xml.length) {
    const apertura = xml.indexOf('<', indice);
    if (apertura < 0) break;

    if (xml.startsWith('<!--', apertura)) {
      const cierre = xml.indexOf('-->', apertura + 4);
      if (cierre < 0) throw new Error('Comentario XML sin cierre');
      indice = cierre + 3;
      continue;
    }
    if (xml.startsWith('<?', apertura)) {
      const cierre = xml.indexOf('?>', apertura + 2);
      if (cierre < 0) throw new Error('Instrucción XML sin cierre');
      indice = cierre + 2;
      continue;
    }
    if (xml.startsWith('<![CDATA[', apertura)) {
      const cierre = xml.indexOf(']]>', apertura + 9);
      if (cierre < 0) throw new Error('CDATA sin cierre');
      indice = cierre + 3;
      continue;
    }
    if (xml.startsWith('<!', apertura)) {
      throw new Error('Declaración XML no permitida');
    }

    const cierre = encontrarCierreEtiqueta(xml, apertura + 1);
    if (cierre < 0) throw new Error('Etiqueta XML sin cierre');
    const contenido = xml.slice(apertura + 1, cierre).trim();

    if (contenido.startsWith('/')) {
      const nombre = contenido.slice(1).trim();
      const actual = pila.pop();
      if (!actual || actual.name !== nombre) {
        throw new Error(`Cierre XML inesperado: ${nombre}`);
      }
    } else {
      const autocierre = contenido.endsWith('/');
      const limpio = autocierre ? contenido.slice(0, -1).trim() : contenido;
      const separador = limpio.search(/\s/);
      const nombre = separador < 0 ? limpio : limpio.slice(0, separador);
      if (!nombre) throw new Error('Etiqueta XML sin nombre');
      const fragmentoAtributos = separador < 0 ? '' : limpio.slice(separador + 1);
      const nodo: XmlNode = {
        name: nombre,
        attrs: parsearAtributos(fragmentoAtributos),
        children: [],
      };

      const padre = pila.at(-1);
      if (padre) {
        padre.children.push(nodo);
      } else if (raiz) {
        throw new Error('El XML contiene más de un elemento raíz');
      } else {
        raiz = nodo;
      }

      if (!autocierre) {
        if (pila.length >= 200) throw new Error('El XML supera la profundidad máxima permitida');
        pila.push(nodo);
      }
    }

    indice = cierre + 1;
  }

  if (pila.length > 0) throw new Error(`Etiqueta XML sin cierre: ${pila.at(-1)!.name}`);
  if (!raiz) throw new Error('El archivo no contiene un elemento XML raíz');
  return raiz;
}

function decodificarArchivo(buffer: Buffer): string {
  const cabecera = buffer.subarray(0, Math.min(buffer.length, 256)).toString('ascii');
  const coincidencia = /encoding\s*=\s*["']([^"']+)["']/i.exec(cabecera);
  const encoding = (coincidencia?.[1] ?? 'utf-8').toLowerCase();

  if (['utf-8', 'utf8'].includes(encoding)) {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  }
  if (['windows-1252', 'cp1252', 'iso-8859-1'].includes(encoding)) {
    return new TextDecoder('windows-1252').decode(buffer);
  }
  throw new Error(`Codificación XML no soportada: ${encoding}`);
}

function mapearVisibilidad(valor: string | undefined): VisibilidadUml {
  switch ((valor ?? 'public').toLowerCase()) {
    case 'private': return 'PRIVADA';
    case 'protected': return 'PROTEGIDA';
    case 'package': return 'PAQUETE';
    default: return 'PUBLICA';
  }
}

function resolverTipo(ref: string | undefined, tipos: Map<string, string>): string {
  if (!ref) return 'Object';
  const resuelto = tipos.get(ref);
  if (resuelto) return resuelto;
  if (ref.startsWith('EAJava_')) return ref.slice('EAJava_'.length) || 'Object';
  const fragmento = ref.split('#').at(-1);
  return fragmento?.trim() || 'Object';
}

function referenciaTipo(nodo: XmlNode): string | undefined {
  return atributo(nodo, 'type') ?? atributo(hijo(nodo, 'type') ?? { name: '', attrs: {}, children: [] }, 'xmi:idref', 'idref');
}

function convertirMultiplicidad(valor: string | undefined): MultiplicidadUml | null | 'INVALIDA' {
  if (!valor) return null;
  const normalizada = valor.trim().replaceAll('-1', '*');
  if (normalizada === '1..1') return '1';
  if (normalizada === '0..1') return '0..1';
  if (normalizada === '0..*') return '0..*';
  if (normalizada === '1..*') return '1..*';
  if (normalizada === '*' || normalizada === '*..*') return '*';
  if (normalizada === '1') return '1';
  return 'INVALIDA';
}

function multiplicidadOwnedEnd(nodo: XmlNode): MultiplicidadUml | null | 'INVALIDA' {
  const inferior = atributo(hijo(nodo, 'lowerValue') ?? { name: '', attrs: {}, children: [] }, 'value');
  const superior = atributo(hijo(nodo, 'upperValue') ?? { name: '', attrs: {}, children: [] }, 'value');
  if (inferior === undefined && superior === undefined) return null;
  const low = inferior ?? '1';
  const up = (superior ?? '1').replace('-1', '*');
  return convertirMultiplicidad(low === up ? low : `${low}..${up}`);
}

function parsearGeometria(valor: string | undefined): { x: number; y: number } | null {
  if (!valor) return null;
  const partes = new Map<string, number>();
  for (const fragmento of valor.split(';')) {
    const [clave, crudo] = fragmento.split('=');
    const numero = Number(crudo);
    if (clave && Number.isFinite(numero)) partes.set(clave, numero);
  }
  const x = partes.get('Left');
  const y = partes.get('Top');
  return x !== undefined && y !== undefined ? { x, y } : null;
}

function extraerPosiciones(raiz: XmlNode): Map<string, { x: number; y: number }> {
  const posiciones = new Map<string, { x: number; y: number }>();

  for (const nodo of descendientes(raiz, (actual) => localName(actual.name) === 'element')) {
    const subject = atributo(nodo, 'subject');
    const geometria = parsearGeometria(atributo(nodo, 'geometry'));
    if (subject && geometria && !posiciones.has(subject)) posiciones.set(subject, geometria);
  }

  for (const shape of descendientes(raiz, (actual) => tipoLocal(atributo(actual, 'xmi:type')) === 'UMLClassifierShape')) {
    const idClase = atributo(shape, 'modelElement');
    const bounds = hijo(shape, 'bounds');
    if (!idClase || !bounds || posiciones.has(idClase)) continue;
    const x = Number(atributo(bounds, 'x'));
    const y = Number(atributo(bounds, 'y'));
    if (Number.isFinite(x) && Number.isFinite(y)) posiciones.set(idClase, { x, y });
  }

  return posiciones;
}

function extraerTagsPersistencia(raiz: XmlNode): Map<string, { persistente?: boolean; identificador?: string }> {
  const resultado = new Map<string, { persistente?: boolean; identificador?: string }>();
  const obtener = (id: string) => {
    const actual = resultado.get(id) ?? {};
    resultado.set(id, actual);
    return actual;
  };

  for (const tag of descendientes(raiz, (actual) => localName(actual.name) === 'tag')) {
    const nombre = atributo(tag, 'name');
    const id = atributo(tag, 'modelElement');
    if (!nombre || !id) continue;
    const actual = obtener(id);
    if (nombre === 'CASE.persistente') actual.persistente = atributo(tag, 'value') === 'true';
    if (nombre === 'CASE.identificador') actual.identificador = atributo(tag, 'value');
  }

  for (const nodo of descendientes(raiz, (actual) => {
    const local = localName(actual.name);
    return local === 'CASE.persistente' || local === 'CASE.identificador';
  })) {
    const id = atributo(nodo, 'base_Class');
    if (!id) continue;
    const actual = obtener(id);
    if (localName(nodo.name) === 'CASE.persistente') {
      actual.persistente = atributo(nodo, 'CASE.persistente') === 'true';
    } else {
      actual.identificador = atributo(nodo, 'CASE.identificador');
    }
  }

  return resultado;
}

function nombrePaquete(raiz: XmlNode): string {
  const paquete = descendientes(raiz, (actual) =>
    localName(actual.name) === 'packagedElement' && tipoLocal(atributo(actual, 'xmi:type')) === 'Package',
  ).find((actual) =>
    descendientes(actual, (nodo) => tipoLocal(atributo(nodo, 'xmi:type')) === 'Class').length > 0,
  );
  return atributo(paquete ?? raiz, 'name')?.trim() || 'Modelo importado';
}

function analizarEstructura(raiz: XmlNode): AnalisisImportacionXmi {
  const errores: ProblemaImportacionXmi[] = [];
  const advertencias: ProblemaImportacionXmi[] = [];
  const tipos = new Map<string, string>();
  const posiciones = extraerPosiciones(raiz);
  const tagsPersistencia = extraerTagsPersistencia(raiz);

  for (const nodo of descendientes(raiz, (actual) => localName(actual.name) === 'packagedElement')) {
    const tipo = tipoLocal(atributo(nodo, 'xmi:type'));
    const id = atributo(nodo, 'xmi:id');
    const nombre = atributo(nodo, 'name');
    if (id && nombre && (tipo === 'PrimitiveType' || tipo === 'Class')) tipos.set(id, nombre);
    if (tipo && !TIPOS_ELEMENTO_SOPORTADOS.has(tipo)) {
      advertencias.push(problema('ELEMENTO_UML_NO_SOPORTADO', 'ADVERTENCIA', `Se ignorará el elemento UML ${tipo}.`, nombre ?? tipo));
    }
  }

  const clasesNodo = descendientes(raiz, (actual) =>
    localName(actual.name) === 'packagedElement' && tipoLocal(atributo(actual, 'xmi:type')) === 'Class',
  );
  if (clasesNodo.length === 0) {
    errores.push(problema('SIN_CLASES', 'ERROR', 'El XMI no contiene clases UML compatibles.'));
  }

  const mapaClases = new Map<string, ClaseTemporal>();
  let usoLayoutAutomatico = false;
  let faltanTagsPersistencia = false;

  clasesNodo.forEach((nodoClase, indiceClase) => {
    const idExterno = atributo(nodoClase, 'xmi:id');
    const nombre = atributo(nodoClase, 'name')?.trim();
    if (!idExterno || !nombre) {
      errores.push(problema('CLASE_INCOMPLETA', 'ERROR', 'Se encontró una clase sin identificador o nombre.'));
      return;
    }

    const posicion = posiciones.get(idExterno) ?? {
      x: 80 + (indiceClase % 4) * 300,
      y: 80 + Math.floor(indiceClase / 4) * 220,
    };
    if (!posiciones.has(idExterno)) usoLayoutAutomatico = true;

    const atributosClase = hijos(nodoClase, 'ownedAttribute').map((nodoAtributo) => ({
      id: randomUUID(),
      nombre: atributo(nodoAtributo, 'name')?.trim() || 'atributo',
      tipo: resolverTipo(referenciaTipo(nodoAtributo), tipos),
      visibilidad: mapearVisibilidad(atributo(nodoAtributo, 'visibility')),
    }));
    const nombresAtributos = new Map(atributosClase.map((actual) => [actual.nombre, actual.id]));

    const operaciones = hijos(nodoClase, 'ownedOperation').map((nodoOperacion) => {
      let tipoRetorno: string | null = null;
      const parametros = [] as { id: string; nombre: string; tipo: string }[];
      for (const nodoParametro of hijos(nodoOperacion, 'ownedParameter')) {
        const direction = (atributo(nodoParametro, 'direction') ?? 'in').toLowerCase();
        const tipo = resolverTipo(referenciaTipo(nodoParametro), tipos);
        if (direction === 'return') {
          tipoRetorno = tipo;
        } else {
          parametros.push({
            id: randomUUID(),
            nombre: atributo(nodoParametro, 'name')?.trim() || `parametro${parametros.length + 1}`,
            tipo,
          });
        }
      }
      return {
        id: randomUUID(),
        nombre: atributo(nodoOperacion, 'name')?.trim() || 'operacion',
        visibilidad: mapearVisibilidad(atributo(nodoOperacion, 'visibility')),
        parametros,
        tipoRetorno,
      };
    });

    const metadata = tagsPersistencia.get(idExterno);
    if (!metadata || metadata.persistente === undefined) faltanTagsPersistencia = true;
    const persistente = metadata?.persistente ?? false;
    const idAtributoIdentificador = persistente && metadata?.identificador
      ? nombresAtributos.get(metadata.identificador) ?? null
      : null;
    if (persistente && metadata?.identificador && !idAtributoIdentificador) {
      advertencias.push(problema('IDENTIFICADOR_NO_ENCONTRADO', 'ADVERTENCIA', `No se encontró el atributo identificador '${metadata.identificador}'.`, nombre));
    }

    const clase: ClaseUml = {
      id: randomUUID(),
      nombre,
      atributos: atributosClase,
      operaciones,
      posicion,
      persistencia: { persistente, idAtributoIdentificador },
    };
    mapaClases.set(idExterno, { idExterno, clase, nombresAtributos });
  });

  if (usoLayoutAutomatico && mapaClases.size > 0) {
    advertencias.push(problema('LAYOUT_AUTOMATICO', 'ADVERTENCIA', 'No todas las clases contienen geometría de diagrama; se generó una distribución automática para las faltantes.'));
  }
  if (faltanTagsPersistencia && mapaClases.size > 0) {
    advertencias.push(problema('PERSISTENCIA_NO_ESPECIFICADA', 'ADVERTENCIA', 'Las clases sin metadata CASE.persistente se importarán como no persistentes.'));
  }

  const relaciones: RelacionUml[] = [];
  const relacionesExternas = new Set<string>();
  const agregarRelacion = (
    idExterno: string,
    tipo: TipoRelacionUml,
    origenExterno: string,
    destinoExterno: string,
    multOrigen: MultiplicidadUml | null,
    multDestino: MultiplicidadUml | null,
    nombre: string | null,
  ) => {
    if (relacionesExternas.has(idExterno)) return;
    const origen = mapaClases.get(origenExterno);
    const destino = mapaClases.get(destinoExterno);
    if (!origen || !destino) {
      advertencias.push(problema('RELACION_FUERA_DEL_SUBCONJUNTO', 'ADVERTENCIA', 'Se ignoró una relación cuyo extremo no corresponde a una clase importable.', nombre));
      return;
    }
    relacionesExternas.add(idExterno);
    relaciones.push({
      id: randomUUID(),
      tipo,
      idClaseOrigen: origen.clase.id,
      idClaseDestino: destino.clase.id,
      nombre: nombre?.trim() || null,
      multiplicidadOrigen: tipo === 'GENERALIZACION' ? null : (multOrigen ?? '1'),
      multiplicidadDestino: tipo === 'GENERALIZACION' ? null : (multDestino ?? '1'),
    });
  };

  const conectores = descendientes(raiz, (actual) => localName(actual.name) === 'connector');
  for (const conector of conectores) {
    const idExterno = atributo(conector, 'xmi:idref', 'xmi:id') ?? `connector-${relacionesExternas.size}`;
    const source = hijo(conector, 'source');
    const target = hijo(conector, 'target');
    if (!source || !target) continue;
    let origenExterno = atributo(source, 'xmi:idref') ?? '';
    let destinoExterno = atributo(target, 'xmi:idref') ?? '';
    const sourceType = hijo(source, 'type');
    const targetType = hijo(target, 'type');
    let multOrigen = convertirMultiplicidad(atributo(sourceType ?? source, 'multiplicity'));
    let multDestino = convertirMultiplicidad(atributo(targetType ?? target, 'multiplicity'));
    const labels = hijo(conector, 'labels');
    if (multOrigen === null) multOrigen = convertirMultiplicidad(atributo(labels ?? conector, 'lb'));
    if (multDestino === null) multDestino = convertirMultiplicidad(atributo(labels ?? conector, 'rb'));
    if (multOrigen === 'INVALIDA' || multDestino === 'INVALIDA') {
      errores.push(problema('MULTIPLICIDAD_NO_SOPORTADA', 'ERROR', 'La relación contiene una multiplicidad fuera del subconjunto soportado.', idExterno));
      continue;
    }
    const aggOrigen = atributo(sourceType ?? source, 'aggregation') ?? 'none';
    const aggDestino = atributo(targetType ?? target, 'aggregation') ?? 'none';
    const propiedades = hijo(conector, 'properties');
    const eaType = (atributo(propiedades ?? conector, 'ea_type') ?? '').toLowerCase();
    const nombre = atributo(propiedades ?? conector, 'name') ?? null;
    let tipo: TipoRelacionUml = eaType === 'generalization' ? 'GENERALIZACION' : 'ASOCIACION';
    if (aggOrigen === 'shared' || aggDestino === 'shared') tipo = 'AGREGACION';
    if (aggOrigen === 'composite' || aggDestino === 'composite') tipo = 'COMPOSICION';
    if ((tipo === 'AGREGACION' || tipo === 'COMPOSICION') && aggOrigen === 'none' && aggDestino !== 'none') {
      [origenExterno, destinoExterno] = [destinoExterno, origenExterno];
      [multOrigen, multDestino] = [multDestino, multOrigen];
    }
    agregarRelacion(idExterno, tipo, origenExterno, destinoExterno, multOrigen, multDestino, nombre);
  }

  for (const nodoClase of clasesNodo) {
    const origenExterno = atributo(nodoClase, 'xmi:id');
    if (!origenExterno) continue;
    for (const generalization of hijos(nodoClase, 'generalization')) {
      const idExterno = atributo(generalization, 'xmi:id') ?? `generalization-${origenExterno}`;
      const destinoExterno = atributo(generalization, 'general');
      if (destinoExterno) agregarRelacion(idExterno, 'GENERALIZACION', origenExterno, destinoExterno, null, null, null);
    }
  }

  for (const association of descendientes(raiz, (actual) =>
    localName(actual.name) === 'packagedElement' && tipoLocal(atributo(actual, 'xmi:type')) === 'Association',
  )) {
    const idExterno = atributo(association, 'xmi:id') ?? `association-${relacionesExternas.size}`;
    if (relacionesExternas.has(idExterno)) continue;
    const ends = hijos(association, 'ownedEnd');
    if (ends.length !== 2) {
      advertencias.push(problema('ASOCIACION_NO_BINARIA', 'ADVERTENCIA', 'Se ignoró una asociación que no tiene exactamente dos extremos.', idExterno));
      continue;
    }
    const extremos = ends.map((end): ExtremoRelacion => ({
      idClaseExterno: referenciaTipo(end) ?? '',
      multiplicidad: multiplicidadOwnedEnd(end) === 'INVALIDA' ? null : multiplicidadOwnedEnd(end) as MultiplicidadUml | null,
      agregacion: atributo(end, 'aggregation') ?? 'none',
    }));
    if (ends.some((end) => multiplicidadOwnedEnd(end) === 'INVALIDA')) {
      errores.push(problema('MULTIPLICIDAD_NO_SOPORTADA', 'ERROR', 'La asociación contiene una multiplicidad fuera del subconjunto soportado.', idExterno));
      continue;
    }
    let [origen, destino] = extremos;
    let tipo: TipoRelacionUml = 'ASOCIACION';
    const agregado = extremos.find((actual) => actual.agregacion === 'shared');
    const compuesto = extremos.find((actual) => actual.agregacion === 'composite');
    if (compuesto) tipo = 'COMPOSICION';
    else if (agregado) tipo = 'AGREGACION';
    const todo = compuesto ?? agregado;
    if (todo && destino === todo) [origen, destino] = [destino, origen];
    agregarRelacion(idExterno, tipo, origen.idClaseExterno, destino.idClaseExterno, origen.multiplicidad, destino.multiplicidad, atributo(association, 'name') ?? null);
  }

  const contenido: ModeloUmlContenido = {
    versionEsquema: 1,
    clases: [...mapaClases.values()].map((actual) => actual.clase),
    relaciones,
    configuracion: { origenImportacion: 'ENTERPRISE_ARCHITECT_XMI' },
  };

  const formato = atributo(descendientes(raiz, (actual) => localName(actual.name) === 'Documentation')[0] ?? raiz, 'exporter') === 'Enterprise Architect'
    ? 'XMI de Enterprise Architect'
    : 'XMI UML compatible';

  const validacion = {
    valido: errores.length === 0 && contenido.clases.length > 0,
    errores,
    advertencias,
    formato,
    nombreSugerido: nombrePaquete(raiz),
    resumen: {
      clases: contenido.clases.length,
      atributos: contenido.clases.reduce((total, clase) => total + clase.atributos.length, 0),
      operaciones: contenido.clases.reduce((total, clase) => total + clase.operaciones.length, 0),
      relaciones: contenido.relaciones.length,
    },
  };

  return { validacion, contenido: validacion.valido ? contenido : null };
}

export function analizarImportacionXmiEnterpriseArchitect(buffer: Buffer): AnalisisImportacionXmi {
  if (buffer.length === 0) {
    return { validacion: { valido: false, errores: [problema('ARCHIVO_VACIO', 'ERROR', 'El archivo XMI está vacío.')], advertencias: [], formato: 'Desconocido', nombreSugerido: 'Modelo importado', resumen: { clases: 0, atributos: 0, operaciones: 0, relaciones: 0 } }, contenido: null };
  }
  if (buffer.length > TAMANO_MAXIMO_XMI_BYTES) {
    return { validacion: { valido: false, errores: [problema('ARCHIVO_DEMASIADO_GRANDE', 'ERROR', 'El archivo XMI supera el límite de 5 MiB.')], advertencias: [], formato: 'Desconocido', nombreSugerido: 'Modelo importado', resumen: { clases: 0, atributos: 0, operaciones: 0, relaciones: 0 } }, contenido: null };
  }

  try {
    const xml = decodificarArchivo(buffer).replace(/^\uFEFF/, '');
    if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) {
      throw new Error('No se permiten DTD ni entidades XML externas');
    }
    const raiz = parsearXml(xml);
    if (localName(raiz.name) !== 'XMI') throw new Error('El elemento raíz debe ser xmi:XMI');
    return analizarEstructura(raiz);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : 'El XML no pudo interpretarse';
    return {
      validacion: {
        valido: false,
        errores: [problema('XMI_NO_INTERPRETABLE', 'ERROR', mensaje)],
        advertencias: [],
        formato: 'Desconocido',
        nombreSugerido: 'Modelo importado',
        resumen: { clases: 0, atributos: 0, operaciones: 0, relaciones: 0 },
      },
      contenido: null,
    };
  }
}
