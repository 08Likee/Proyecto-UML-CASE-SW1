import type {
  ClaseUml,
  ModeloUml,
  MultiplicidadUml,
  RelacionUml,
  VisibilidadUml,
} from '../models/modelo-uml';

const TIPOS_PRIMITIVOS = new Set([
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

const ANCHO_MINIMO_CLASE = 150;
const ANCHO_MAXIMO_CLASE = 360;
const ANCHO_APROXIMADO_CARACTER = 7;
const PADDING_HORIZONTAL_CLASE = 36;
const ALTO_BASE_CLASE = 42;
const ALTO_MINIMO_CLASE = 60;
const ALTO_FILA = 18;
const MARGEN_DIAGRAMA = 50;

function limpiarCaracteresXml(valor: string): string {
  return Array.from(valor)
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0);

      if (codigo === undefined) {
        return false;
      }

      return (
        codigo === 0x09 ||
        codigo === 0x0a ||
        codigo === 0x0d ||
        (codigo >= 0x20 && codigo <= 0xd7ff) ||
        (codigo >= 0xe000 && codigo <= 0xfffd) ||
        (codigo >= 0x10000 && codigo <= 0x10ffff)
      );
    })
    .join('');
}

function xml(valor: string): string {
  return limpiarCaracteresXml(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function idEa(prefijo: string, valor: string): string {
  const normalizado = valor
    .replace(/[^A-Za-z0-9_.-]/g, '_')
    .replaceAll('-', '_');
  return `${prefijo}_${normalizado}`;
}

function sufijoGuidOperacion(valor: string): string {
  const partes = valor.split('-');
  return partes.length > 1 ? partes.slice(1).join('-') : valor;
}

function idRetornoUmlOperacion(operacionId: string): string {
  return `EAID_RT000000_${sufijoGuidOperacion(operacionId).replaceAll('-', '_')}`;
}

function idRetornoExtensionEa(operacionId: string): string {
  return `EAID_RETURNID_${sufijoGuidOperacion(operacionId).replaceAll('-', '_')}`;
}

function guidEa(valor: string): string {
  return `{${valor}}`;
}

function guidRetornoExtensionEa(operacionId: string): string {
  return `{RETURNID-${sufijoGuidOperacion(operacionId)}}`;
}

function hashFnv1a(valor: string): string {
  let hash = 0x811c9dc5;
  for (let indice = 0; indice < valor.length; indice += 1) {
    hash ^= valor.charCodeAt(indice);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function idTipo(tipo: string): string {
  return `EATYPE_${hashFnv1a(tipo)}`;
}

function visibilidadXmi(visibilidad: VisibilidadUml): string {
  switch (visibilidad) {
    case 'PUBLICA':
      return 'public';
    case 'PRIVADA':
      return 'private';
    case 'PROTEGIDA':
      return 'protected';
    case 'PAQUETE':
      return 'package';
  }
}

function limitesMultiplicidad(multiplicidad: MultiplicidadUml): {
  inferior: string;
  superior: string;
} {
  switch (multiplicidad) {
    case '1':
      return { inferior: '1', superior: '1' };
    case '0..1':
      return { inferior: '0', superior: '1' };
    case '*':
    case '0..*':
      return { inferior: '0', superior: '*' };
    case '1..*':
      return { inferior: '1', superior: '*' };
  }
}

function recopilarTipos(modelo: ModeloUml): string[] {
  const tipos = new Set<string>();

  for (const clase of modelo.contenido.clases) {
    for (const atributo of clase.atributos) {
      tipos.add(atributo.tipo.trim());
    }

    for (const operacion of clase.operaciones) {
      for (const parametro of operacion.parametros) {
        tipos.add(parametro.tipo.trim());
      }
      if (operacion.tipoRetorno) {
        tipos.add(operacion.tipoRetorno.trim());
      }
    }
  }

  return [...tipos].sort((a, b) => a.localeCompare(b));
}

function generarTipos(modelo: ModeloUml): string[] {
  return recopilarTipos(modelo).map((tipo) => {
    const xmiType = TIPOS_PRIMITIVOS.has(tipo)
      ? 'uml:PrimitiveType'
      : 'uml:DataType';
    return `    <packagedElement xmi:type="${xmiType}" xmi:id="${idTipo(tipo)}" name="${xml(tipo)}" visibility="public"/>`;
  });
}

function generarAtributo(clase: ClaseUml, indice: number): string[] {
  const atributo = clase.atributos[indice];
  const idAtributo = idEa('EAID', atributo.id);
  return [
    `      <ownedAttribute xmi:type="uml:Property" xmi:id="${idAtributo}" name="${xml(atributo.nombre)}" visibility="${visibilidadXmi(atributo.visibilidad)}">`,
    `        <type xmi:idref="${idTipo(atributo.tipo.trim())}"/>`,
    `        <lowerValue xmi:type="uml:LiteralInteger" xmi:id="${idEa('EAID_LI_LOW', atributo.id)}" value="1"/>`,
    `        <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="${idEa('EAID_LI_UP', atributo.id)}" value="1"/>`,
    '      </ownedAttribute>',
  ];
}

function generarOperacion(clase: ClaseUml, indice: number): string[] {
  const operacion = clase.operaciones[indice];
  const lineas = [
    `      <ownedOperation xmi:type="uml:Operation" xmi:id="${idEa('EAID', operacion.id)}" name="${xml(operacion.nombre)}" visibility="${visibilidadXmi(operacion.visibilidad)}">`,
  ];

  for (const parametro of operacion.parametros) {
    lineas.push(
      `        <ownedParameter xmi:type="uml:Parameter" xmi:id="${idEa('EAID', parametro.id)}" name="${xml(parametro.nombre)}" direction="in" type="${idTipo(parametro.tipo.trim())}"/>`,
    );
  }

  if (operacion.tipoRetorno) {
    lineas.push(
      `        <ownedParameter xmi:type="uml:Parameter" xmi:id="${idRetornoUmlOperacion(operacion.id)}" name="return" direction="return" type="${idTipo(operacion.tipoRetorno.trim())}"/>`,
    );
  }

  lineas.push('      </ownedOperation>');
  return lineas;
}

function generarGeneralizaciones(
  clase: ClaseUml,
  relaciones: RelacionUml[],
): string[] {
  return relaciones
    .filter(
      (relacion) =>
        relacion.tipo === 'GENERALIZACION' &&
        relacion.idClaseOrigen === clase.id,
    )
    .map(
      (relacion) =>
        `      <generalization xmi:type="uml:Generalization" xmi:id="${idEa('EAID', relacion.id)}" general="${idEa('EAID', relacion.idClaseDestino)}"/>`,
    );
}

function generarClase(clase: ClaseUml, relaciones: RelacionUml[]): string[] {
  const lineas = [
    `    <packagedElement xmi:type="uml:Class" xmi:id="${idEa('EAID', clase.id)}" name="${xml(clase.nombre)}" visibility="public">`,
  ];

  for (let indice = 0; indice < clase.atributos.length; indice += 1) {
    lineas.push(...generarAtributo(clase, indice));
  }

  for (let indice = 0; indice < clase.operaciones.length; indice += 1) {
    lineas.push(...generarOperacion(clase, indice));
  }

  lineas.push(...generarGeneralizaciones(clase, relaciones));
  lineas.push('    </packagedElement>');
  return lineas;
}

function generarExtremoAsociacion(
  relacion: RelacionUml,
  extremo: 'origen' | 'destino',
): string[] {
  const esOrigen = extremo === 'origen';
  const idClase = esOrigen ? relacion.idClaseOrigen : relacion.idClaseDestino;
  const multiplicidad = esOrigen
    ? relacion.multiplicidadOrigen
    : relacion.multiplicidadDestino;

  if (!multiplicidad) {
    throw new Error('Una asociación exportable debe contener multiplicidades');
  }

  const { inferior, superior } = limitesMultiplicidad(multiplicidad);
  const idExtremo = idEa(esOrigen ? 'EAID_SRC' : 'EAID_DST', relacion.id);
  const agregacion =
    esOrigen && relacion.tipo === 'AGREGACION'
      ? 'shared'
      : esOrigen && relacion.tipo === 'COMPOSICION'
        ? 'composite'
        : 'none';

  return [
    `      <ownedEnd xmi:type="uml:Property" xmi:id="${idExtremo}" visibility="public" association="${idEa('EAID', relacion.id)}" type="${idEa('EAID', idClase)}" aggregation="${agregacion}">`,
    `        <lowerValue xmi:type="uml:LiteralInteger" xmi:id="${idExtremo}_LOWER" value="${inferior}"/>`,
    `        <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="${idExtremo}_UPPER" value="${superior}"/>`,
    '      </ownedEnd>',
  ];
}

function generarAsociacion(relacion: RelacionUml): string[] {
  const idRelacion = idEa('EAID', relacion.id);
  const idOrigen = idEa('EAID_SRC', relacion.id);
  const idDestino = idEa('EAID_DST', relacion.id);
  const nombre = relacion.nombre ? ` name="${xml(relacion.nombre)}"` : '';
  return [
    `    <packagedElement xmi:type="uml:Association" xmi:id="${idRelacion}"${nombre} visibility="public">`,
    `      <memberEnd xmi:idref="${idOrigen}"/>`,
    `      <memberEnd xmi:idref="${idDestino}"/>`,
    ...generarExtremoAsociacion(relacion, 'origen'),
    ...generarExtremoAsociacion(relacion, 'destino'),
    '    </packagedElement>',
  ];
}

function multiplicidadDiagrama(
  multiplicidad: MultiplicidadUml | null,
): string | null {
  if (!multiplicidad) {
    return null;
  }
  return multiplicidad === '1'
    ? '1..1'
    : multiplicidad === '*'
      ? '0..*'
      : multiplicidad;
}

function generarDiagramaUmlDi(modelo: ModeloUml, idPaquete: string): string[] {
  const posiciones = coordenadasNormalizadas(modelo);
  const idDiagrama = idEa('EADGM', modelo.id);
  const lineas = [
    `    <umldi:Diagram xmi:type="umldi:UMLClassDiagram" xmi:id="${idDiagrama}" isFrame="false" modelElement="${idPaquete}">`,
  ];

  for (const clase of modelo.contenido.clases) {
    const posicion = posiciones.get(clase.id)!;
    const ancho = anchoClase(clase);
    const alto = alturaClase(clase);
    const idForma = idEa('EASHAPE', clase.id);
    lineas.push(
      `      <ownedElement xmi:type="umldi:UMLClassifierShape" xmi:id="${idForma}" modelElement="${idEa('EAID', clase.id)}">`,
      `        <ownedElement xmi:type="umldi:UMLNameLabel" xmi:id="${idEa('EANAME', clase.id)}" text="${xml(clase.nombre)}"/>`,
      `        <bounds xmi:type="dc:bounds" xmi:id="${idEa('EABOUNDS', clase.id)}" x="${posicion.x}" y="${posicion.y}" width="${ancho}" height="${alto}"/>`,
      '      </ownedElement>',
    );
  }

  for (const relacion of modelo.contenido.relaciones) {
    const claseOrigen = modelo.contenido.clases.find(
      (clase) => clase.id === relacion.idClaseOrigen,
    )!;
    const claseDestino = modelo.contenido.clases.find(
      (clase) => clase.id === relacion.idClaseDestino,
    )!;
    const posicionOrigen = posiciones.get(claseOrigen.id)!;
    const posicionDestino = posiciones.get(claseDestino.id)!;
    const centroOrigen = {
      x: posicionOrigen.x + Math.round(anchoClase(claseOrigen) / 2),
      y: posicionOrigen.y + Math.round(alturaClase(claseOrigen) / 2),
    };
    const centroDestino = {
      x: posicionDestino.x + Math.round(anchoClase(claseDestino) / 2),
      y: posicionDestino.y + Math.round(alturaClase(claseDestino) / 2),
    };
    const idArista = idEa('EAEDGE', relacion.id);

    lineas.push(
      `      <ownedElement xmi:type="umldi:UMLEdge" xmi:id="${idArista}" source="${idEa('EAID', relacion.idClaseOrigen)}" target="${idEa('EAID', relacion.idClaseDestino)}" modelElement="${idEa('EAID', relacion.id)}">`,
    );

    if (relacion.tipo !== 'GENERALIZACION') {
      const multiplicidadOrigen = multiplicidadDiagrama(
        relacion.multiplicidadOrigen,
      );
      const multiplicidadDestino = multiplicidadDiagrama(
        relacion.multiplicidadDestino,
      );
      if (multiplicidadOrigen) {
        lineas.push(
          `        <ownedElement xmi:type="umldi:UMLMultiplicityLabel" xmi:id="${idEa('EASML', relacion.id)}" text="${xml(multiplicidadOrigen)}" modelElement="${idEa('EAID_SRC', relacion.id)}">`,
          `          <bounds xmi:type="dc:bounds" xmi:id="${idEa('EABOUNDS_SRC', relacion.id)}" x="${centroOrigen.x}" y="${centroOrigen.y}" width="48" height="15"/>`,
          '        </ownedElement>',
        );
      }
      if (multiplicidadDestino) {
        lineas.push(
          `        <ownedElement xmi:type="umldi:UMLMultiplicityLabel" xmi:id="${idEa('EATML', relacion.id)}" text="${xml(multiplicidadDestino)}" modelElement="${idEa('EAID_DST', relacion.id)}">`,
          `          <bounds xmi:type="dc:bounds" xmi:id="${idEa('EABOUNDS_DST', relacion.id)}" x="${centroDestino.x}" y="${centroDestino.y}" width="48" height="15"/>`,
          '        </ownedElement>',
        );
      }
    }

    lineas.push(
      `        <waypoint xmi:type="dc:waypoint" xmi:id="${idEa('EAWP_SRC', relacion.id)}" x="${centroOrigen.x}" y="${centroOrigen.y}"/>`,
      `        <waypoint xmi:type="dc:waypoint" xmi:id="${idEa('EAWP_DST', relacion.id)}" x="${centroDestino.x}" y="${centroDestino.y}"/>`,
      '      </ownedElement>',
    );
  }

  lineas.push('    </umldi:Diagram>');
  return lineas;
}

function textoOperacionParaDiagrama(clase: ClaseUml, indice: number): string {
  const operacion = clase.operaciones[indice];
  const parametros = operacion.parametros
    .map((parametro) => `${parametro.nombre}: ${parametro.tipo}`)
    .join(', ');
  const retorno = operacion.tipoRetorno ? `: ${operacion.tipoRetorno}` : '';
  return `${operacion.nombre}(${parametros})${retorno}`;
}

function anchoClase(clase: ClaseUml): number {
  const textos = [
    clase.nombre,
    ...clase.atributos.map(
      (atributo) => `${atributo.nombre}: ${atributo.tipo}`,
    ),
    ...clase.operaciones.map((_, indice) =>
      textoOperacionParaDiagrama(clase, indice),
    ),
  ];
  const longitudMaxima = Math.max(...textos.map((texto) => texto.length));
  const anchoEstimado =
    longitudMaxima * ANCHO_APROXIMADO_CARACTER + PADDING_HORIZONTAL_CLASE;

  return Math.min(
    ANCHO_MAXIMO_CLASE,
    Math.max(ANCHO_MINIMO_CLASE, anchoEstimado),
  );
}

function alturaClase(clase: ClaseUml): number {
  const filas = clase.atributos.length + clase.operaciones.length;
  return Math.max(ALTO_MINIMO_CLASE, ALTO_BASE_CLASE + filas * ALTO_FILA);
}

function coordenadasNormalizadas(
  modelo: ModeloUml,
): Map<string, { x: number; y: number }> {
  const clases = modelo.contenido.clases;
  const minimoX =
    clases.length > 0
      ? Math.min(...clases.map((clase) => clase.posicion.x))
      : 0;
  const minimoY =
    clases.length > 0
      ? Math.min(...clases.map((clase) => clase.posicion.y))
      : 0;
  const desplazamientoX =
    minimoX < MARGEN_DIAGRAMA ? MARGEN_DIAGRAMA - minimoX : 0;
  const desplazamientoY =
    minimoY < MARGEN_DIAGRAMA ? MARGEN_DIAGRAMA - minimoY : 0;

  return new Map(
    clases.map((clase) => [
      clase.id,
      {
        x: Math.round(clase.posicion.x + desplazamientoX),
        y: Math.round(clase.posicion.y + desplazamientoY),
      },
    ]),
  );
}

function generarTagsClase(clase: ClaseUml): string[] {
  const lineas = ['      <tags>'];
  lineas.push(
    `        <tag xmi:id="${idEa('EATAG_PERSIST', clase.id)}" name="CASE.persistente" value="${clase.persistencia.persistente ? 'true' : 'false'}" modelElement="${idEa('EAID', clase.id)}"/>`,
  );

  if (clase.persistencia.idAtributoIdentificador) {
    const atributo = clase.atributos.find(
      (item) => item.id === clase.persistencia.idAtributoIdentificador,
    );
    lineas.push(
      `        <tag xmi:id="${idEa('EATAG_ID', clase.id)}" name="CASE.identificador" value="${xml(atributo?.nombre ?? clase.persistencia.idAtributoIdentificador)}" modelElement="${idEa('EAID', clase.id)}"/>`,
    );
  }

  lineas.push('      </tags>');
  return lineas;
}

function visibilidadEaExtension(visibilidad: VisibilidadUml): string {
  switch (visibilidad) {
    case 'PUBLICA':
      return 'Public';
    case 'PRIVADA':
      return 'Private';
    case 'PROTEGIDA':
      return 'Protected';
    case 'PAQUETE':
      return 'Package';
  }
}

function generarAtributosExtensionEa(
  clase: ClaseUml,
  idLocalInicial: number,
): string[] {
  if (clase.atributos.length === 0) {
    return [];
  }

  const lineas = ['      <attributes>'];

  clase.atributos.forEach((atributo, indice) => {
    lineas.push(
      `        <attribute xmi:idref="${idEa('EAID', atributo.id)}" name="${xml(atributo.nombre)}" scope="${visibilidadEaExtension(atributo.visibilidad)}">`,
      '          <initial/>',
      '          <documentation/>',
      `          <model ea_localid="${idLocalInicial + indice}"/>`,
      `          <properties type="${xml(atributo.tipo.trim())}" derived="0" collection="false" static="0" duplicates="0" changeability="changeable"/>`,
      '          <coords ordered="0"/>',
      `          <containment position="${indice}"/>`,
      '          <stereotype/>',
      '          <bounds lower="1" upper="1"/>',
      '          <options/>',
      '          <style/>',
      '          <styleex value="IsLiteral=0;"/>',
      '          <tags/>',
      '          <xrefs/>',
      '        </attribute>',
    );
  });

  lineas.push('      </attributes>');
  return lineas;
}

function clasificadorExtensionEa(tipo: string): string {
  return TIPOS_PRIMITIVOS.has(tipo) ? '' : ` classifier="${idTipo(tipo)}"`;
}

function generarOperacionesExtensionEa(
  clase: ClaseUml,
  idLocalInicial: number,
): string[] {
  if (clase.operaciones.length === 0) {
    return [];
  }

  const lineas = ['      <operations>'];

  clase.operaciones.forEach((operacion, indiceOperacion) => {
    const tipoRetorno = operacion.tipoRetorno?.trim() || null;
    const atributoTipoRetorno = tipoRetorno
      ? ` type="${xml(tipoRetorno)}"`
      : '';

    lineas.push(
      `        <operation xmi:idref="${idEa('EAID', operacion.id)}" name="${xml(operacion.nombre)}" scope="${visibilidadEaExtension(operacion.visibilidad)}">`,
      `          <properties position="${indiceOperacion}"/>`,
      '          <stereotype/>',
      `          <model ea_guid="${guidEa(operacion.id)}" ea_localid="${idLocalInicial + indiceOperacion}"/>`,
      `          <type${atributoTipoRetorno} const="false" static="false" isAbstract="false" synchronised="0" concurrency="Sequential" pure="0" isQuery="false"/>`,
      '          <behaviour/>',
      '          <code/>',
      '          <style/>',
      '          <styleex/>',
      '          <documentation/>',
      '          <tags/>',
      '          <parameters>',
    );

    const propiedadesRetorno = tipoRetorno
      ? ` pos="0" type="${xml(tipoRetorno)}" const="false"${clasificadorExtensionEa(tipoRetorno)} ea_guid="${guidRetornoExtensionEa(operacion.id)}"`
      : ` pos="0" const="false" ea_guid="${guidRetornoExtensionEa(operacion.id)}"`;

    lineas.push(
      `            <parameter xmi:idref="${idRetornoExtensionEa(operacion.id)}" visibility="public">`,
      `              <properties${propiedadesRetorno}/>`,
      '              <style/>',
      '              <styleex/>',
      '              <documentation/>',
      '              <tags/>',
      '              <xrefs/>',
      '            </parameter>',
    );

    operacion.parametros.forEach((parametro, indiceParametro) => {
      const tipoParametro = parametro.tipo.trim();
      lineas.push(
        `            <parameter xmi:idref="${idEa('EAID', parametro.id)}" visibility="public">`,
        `              <properties pos="${indiceParametro}" type="${xml(tipoParametro)}" const="false"${clasificadorExtensionEa(tipoParametro)} ea_guid="${guidEa(parametro.id)}"/>`,
        '              <style/>',
        '              <styleex/>',
        '              <documentation/>',
        '              <tags/>',
        '              <xrefs/>',
        '            </parameter>',
      );
    });

    lineas.push(
      '          </parameters>',
      '          <xrefs/>',
      '        </operation>',
    );
  });

  lineas.push('      </operations>');
  return lineas;
}

function generarLinksClase(
  clase: ClaseUml,
  relaciones: RelacionUml[],
): string[] {
  const asociaciones = relaciones.filter(
    (relacion) =>
      relacion.tipo !== 'GENERALIZACION' &&
      (relacion.idClaseOrigen === clase.id ||
        relacion.idClaseDestino === clase.id),
  );

  if (asociaciones.length === 0) {
    return [];
  }

  return [
    '      <links>',
    ...asociaciones.map(
      (relacion) =>
        `        <Association xmi:id="${idEa('EAID', relacion.id)}" start="${idEa('EAID', relacion.idClaseOrigen)}" end="${idEa('EAID', relacion.idClaseDestino)}"/>`,
    ),
    '      </links>',
  ];
}

function generarElementosExtension(
  modelo: ModeloUml,
  idPaquete: string,
): string[] {
  const lineas: string[] = [];
  let siguienteIdLocalAtributo = 1000;
  let siguienteIdLocalOperacion = 2000;

  modelo.contenido.clases.forEach((clase, indice) => {
    const atributosExtension = generarAtributosExtensionEa(
      clase,
      siguienteIdLocalAtributo,
    );
    const operacionesExtension = generarOperacionesExtensionEa(
      clase,
      siguienteIdLocalOperacion,
    );

    lineas.push(
      `    <element xmi:idref="${idEa('EAID', clase.id)}" xmi:type="uml:Class" name="${xml(clase.nombre)}" scope="public">`,
      `      <model package="${idPaquete}" tpos="${indice}" ea_localid="${indice + 2}" ea_eleType="element"/>`,
      '      <properties isSpecification="false" sType="Class" nType="0" scope="public"/>',
      '      <project version="1.0" phase="1.0" complexity="1" status="Proposed"/>',
      '      <code gentype="Java"/>',
      '      <style appearance="BackColor=-1;BorderColor=-1;BorderWidth=-1;FontColor=-1;VSwimLanes=1;HSwimLanes=1;BorderStyle=0;"/>',
      ...generarTagsClase(clase),
      '      <xrefs/>',
      // En la extensión de EA, "tagged" representa el bookmark visual, no la presencia de tagged values.
      `      <extendedProperties tagged="0" package_name="${xml(modelo.nombre)}"/>`,
      ...atributosExtension,
      ...operacionesExtension,
      ...generarLinksClase(clase, modelo.contenido.relaciones),
      '    </element>',
    );

    siguienteIdLocalAtributo += clase.atributos.length;
    siguienteIdLocalOperacion += clase.operaciones.length;
  });

  return lineas;
}

function tipoConectorEa(relacion: RelacionUml): string {
  if (relacion.tipo === 'GENERALIZACION') {
    return 'Generalization';
  }
  if (relacion.tipo === 'AGREGACION' || relacion.tipo === 'COMPOSICION') {
    return 'Aggregation';
  }
  return 'Association';
}

function agregacionEa(relacion: RelacionUml): string {
  if (relacion.tipo === 'AGREGACION') {
    return 'shared';
  }
  if (relacion.tipo === 'COMPOSICION') {
    return 'composite';
  }
  return 'none';
}

function generarConectoresExtension(modelo: ModeloUml): string[] {
  const indiceClases = new Map(
    modelo.contenido.clases.map((clase, indice) => [clase.id, indice + 2]),
  );
  const clasePorId = new Map(
    modelo.contenido.clases.map((clase) => [clase.id, clase]),
  );
  const lineas: string[] = [];

  for (const [indice, relacion] of modelo.contenido.relaciones.entries()) {
    const origen = clasePorId.get(relacion.idClaseOrigen)!;
    const destino = clasePorId.get(relacion.idClaseDestino)!;
    const tipo = tipoConectorEa(relacion);
    const agregacion = agregacionEa(relacion);
    const multiplicidadOrigen = multiplicidadDiagrama(
      relacion.multiplicidadOrigen,
    );
    const multiplicidadDestino = multiplicidadDiagrama(
      relacion.multiplicidadDestino,
    );
    const atributoMultiplicidadOrigen = multiplicidadOrigen
      ? ` multiplicity="${xml(multiplicidadOrigen)}"`
      : '';
    const atributoMultiplicidadDestino = multiplicidadDestino
      ? ` multiplicity="${xml(multiplicidadDestino)}"`
      : '';
    const etiquetas =
      multiplicidadOrigen && multiplicidadDestino
        ? `      <labels lb="${xml(multiplicidadOrigen)}" rb="${xml(multiplicidadDestino)}"/>`
        : '      <labels/>';

    lineas.push(
      `    <connector xmi:idref="${idEa('EAID', relacion.id)}">`,
      `      <source xmi:idref="${idEa('EAID', origen.id)}">`,
      `        <model ea_localid="${indiceClases.get(origen.id)}" type="Class" name="${xml(origen.nombre)}"/>`,
      '        <role visibility="Public"/>',
      `        <type${atributoMultiplicidadOrigen} aggregation="${agregacion}"/>`,
      '        <constraints/>',
      '        <modifiers isOrdered="false" isNavigable="false"/>',
      '        <style value="Derived=0;Union=0;Owned=0;Navigable=Unspecified;"/>',
      '        <documentation/>',
      '        <xrefs/>',
      '        <tags/>',
      '      </source>',
      `      <target xmi:idref="${idEa('EAID', destino.id)}">`,
      `        <model ea_localid="${indiceClases.get(destino.id)}" type="Class" name="${xml(destino.nombre)}"/>`,
      '        <role visibility="Public"/>',
      `        <type${atributoMultiplicidadDestino} aggregation="none"/>`,
      '        <constraints/>',
      '        <modifiers isOrdered="false" isNavigable="false"/>',
      '        <style value="Derived=0;Union=0;Owned=0;Navigable=Unspecified;"/>',
      '        <documentation/>',
      '        <xrefs/>',
      '        <tags/>',
      '      </target>',
      `      <model ea_localid="${indice + 1}"/>`,
      `      <properties name="${xml(relacion.nombre ?? '')}" ea_type="${tipo}" direction="Unspecified"/>`,
      '      <documentation/>',
      '      <appearance linemode="3" linecolor="0" linewidth="0" seqno="0" headStyle="0" lineStyle="0"/>',
      etiquetas,
      '      <extendedProperties/>',
      '      <style/>',
      '      <xrefs/>',
      '      <tags/>',
      '    </connector>',
    );
  }

  return lineas;
}

function generarDiagramaExtension(
  modelo: ModeloUml,
  idPaquete: string,
): string[] {
  const posiciones = coordenadasNormalizadas(modelo);
  const idDiagrama = idEa('EADGM', modelo.id);
  const lineas = [
    `    <diagram xmi:id="${idDiagrama}">`,
    `      <model package="${idPaquete}" localID="1" owner="${idPaquete}"/>`,
    `      <properties name="${xml(modelo.nombre)}" type="Logical"/>`,
    '      <project version="1.0"/>',
    '      <style1 value="ShowPrivate=1;ShowProtected=1;ShowPublic=1;HideRelationships=0;Locked=0;Border=1;PackageContents=1;Zoom=100;ShowDetails=0;ShowTags=0;OpParams=1;ShowOpRetType=1;HideAtts=0;HideOps=0;HideStereo=0;ConnectorNotation=UML 2.1;ExplicitNavigability=0;"/>',
    '      <style2 value="HideQuals=0;AttPkg=1;TConnectorNotation=UML 2.1;TExplicitNavigability=0;ShowOpRetType=1;SuppressBrackets=0;"/>',
    '      <swimlanes value="locked=false;orientation=0;width=0;inbar=false;names=false;color=-1;bold=false;"/>',
    '      <matrixitems value="locked=false;matrixactive=false;swimlanesactive=false;kanbanactive=false;width=1;clrLine=0;"/>',
    '      <extendedProperties/>',
    '      <elements>',
  ];

  modelo.contenido.clases.forEach((clase, indice) => {
    const posicion = posiciones.get(clase.id)!;
    const left = posicion.x;
    const top = posicion.y;
    const right = left + anchoClase(clase);
    const bottom = top + alturaClase(clase);
    lineas.push(
      `        <element geometry="Left=${left};Top=${top};Right=${right};Bottom=${bottom};" subject="${idEa('EAID', clase.id)}" seqno="${indice + 1}" style="DUID=${hashFnv1a(clase.id)};"/>`,
    );
  });

  for (const relacion of modelo.contenido.relaciones) {
    lineas.push(
      `        <element geometry="SX=0;SY=0;EX=0;EY=0;Path=;" subject="${idEa('EAID', relacion.id)}" style=";Hidden=0;"/>`,
    );
  }

  lineas.push('      </elements>', '    </diagram>');
  return lineas;
}

export function generarXmiEnterpriseArchitect(modelo: ModeloUml): string {
  const idPaquete = idEa('EAPK', modelo.id);
  const idModelo = idEa('EAMODEL', modelo.id);
  const lineas: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<xmi:XMI xmlns:uml="http://www.omg.org/spec/UML/20131001" xmlns:xmi="http://www.omg.org/spec/XMI/20131001" xmlns:umldi="http://www.omg.org/spec/UML/20131001/UMLDI" xmlns:dc="http://www.omg.org/spec/UML/20131001/UMLDC">',
    '  <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>',
    '  <!-- Generado por Herramienta CASE; metadata de exportador usada para compatibilidad con extensiones visuales de Enterprise Architect. -->',
    `  <uml:Model xmi:type="uml:Model" xmi:id="${idModelo}" name="EA_Model" visibility="public">`,
    `  <packagedElement xmi:type="uml:Package" xmi:id="${idPaquete}" name="${xml(modelo.nombre)}" visibility="public">`,
  ];

  if (modelo.descripcion) {
    lineas.push(
      `    <ownedComment xmi:type="uml:Comment" xmi:id="${idEa('EACOMMENT', modelo.id)}" annotatedElement="${idPaquete}">`,
      `      <body>${xml(modelo.descripcion)}</body>`,
      '    </ownedComment>',
    );
  }

  lineas.push(...generarTipos(modelo));

  for (const clase of modelo.contenido.clases) {
    lineas.push(...generarClase(clase, modelo.contenido.relaciones));
  }

  for (const relacion of modelo.contenido.relaciones) {
    if (relacion.tipo !== 'GENERALIZACION') {
      lineas.push(...generarAsociacion(relacion));
    }
  }

  lineas.push(
    '  </packagedElement>',
    ...generarDiagramaUmlDi(modelo, idPaquete),
    '  </uml:Model>',
    '  <xmi:Extension extender="Enterprise Architect" extenderID="6.5">',
    '  <elements>',
    `    <element xmi:idref="${idPaquete}" xmi:type="uml:Package" name="${xml(modelo.nombre)}" scope="public">`,
    `      <model package2="${idPaquete}" tpos="0" ea_localid="1" ea_eleType="package"/>`,
    '      <properties isSpecification="false" sType="Package" nType="0" scope="public"/>',
    '      <project version="1.0" phase="1.0" complexity="1" status="Proposed"/>',
    '      <code gentype="Java"/>',
    '      <style appearance="BackColor=-1;BorderColor=-1;BorderWidth=-1;FontColor=-1;VSwimLanes=1;HSwimLanes=1;BorderStyle=0;"/>',
    '      <tags/>',
    '      <xrefs/>',
    '      <extendedProperties tagged="0" package_name="Model"/>',
    '      <packageproperties version="1.0"/>',
    '      <paths/>',
    '      <flags iscontrolled="FALSE" isprotected="FALSE" usedtd="FALSE" logxml="FALSE" packageFlags="isModel=1;VICON=2;"/>',
    '    </element>',
    ...generarElementosExtension(modelo, idPaquete),
    '  </elements>',
    '  <connectors>',
    ...generarConectoresExtension(modelo),
    '  </connectors>',
    '  <primitivetypes>',
    '    <packagedElement xmi:type="uml:Package" xmi:id="EAPrimitiveTypesPackage" name="EA_PrimitiveTypes_Package" visibility="public"/>',
    '  </primitivetypes>',
    '  <profiles/>',
    '  <diagrams>',
    ...generarDiagramaExtension(modelo, idPaquete),
    '  </diagrams>',
    '  </xmi:Extension>',
    '</xmi:XMI>',
    '',
  );

  return lineas.join('\n');
}
