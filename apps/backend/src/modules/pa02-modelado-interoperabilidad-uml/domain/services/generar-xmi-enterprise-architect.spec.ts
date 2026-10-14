import type { ModeloUml } from '../models/modelo-uml';
import { generarXmiEnterpriseArchitect } from './generar-xmi-enterprise-architect';

function crearModelo(): ModeloUml {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    nombre: 'Ventas & logística',
    descripcion: 'Modelo <principal> para ventas',
    version: 7,
    estado: 'ACTIVO',
    fechaCreacion: new Date('2026-10-14T12:00:00Z'),
    fechaActualizacion: new Date('2026-10-14T12:00:00Z'),
    idProyecto: '10000000-0000-4000-8000-000000000002',
    contenido: {
      versionEsquema: 1,
      configuracion: {},
      clases: [
        {
          id: '10000000-0000-4000-8000-000000000010',
          nombre: 'Venta',
          posicion: { x: -20, y: 40 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: '10000000-0000-4000-8000-000000000011',
          },
          atributos: [
            {
              id: '10000000-0000-4000-8000-000000000011',
              nombre: 'id',
              tipo: 'Integer',
              visibilidad: 'PRIVADA',
            },
            {
              id: '10000000-0000-4000-8000-000000000012',
              nombre: 'estado',
              tipo: 'EstadoVenta',
              visibilidad: 'PROTEGIDA',
            },
          ],
          operaciones: [
            {
              id: '10000000-0000-4000-8000-000000000013',
              nombre: 'calcularTotal',
              visibilidad: 'PUBLICA',
              parametros: [
                {
                  id: '10000000-0000-4000-8000-000000000014',
                  nombre: 'impuesto',
                  tipo: 'Double',
                },
              ],
              tipoRetorno: 'Decimal',
            },
          ],
        },
        {
          id: '10000000-0000-4000-8000-000000000020',
          nombre: 'DetalleVenta',
          posicion: { x: 420, y: 280 },
          persistencia: {
            persistente: false,
            idAtributoIdentificador: null,
          },
          atributos: [],
          operaciones: [],
        },
        {
          id: '10000000-0000-4000-8000-000000000040',
          nombre: 'VentaEspecial',
          posicion: { x: 760, y: 80 },
          persistencia: {
            persistente: false,
            idAtributoIdentificador: null,
          },
          atributos: [],
          operaciones: [],
        },
      ],
      relaciones: [
        {
          id: '10000000-0000-4000-8000-000000000030',
          tipo: 'COMPOSICION',
          idClaseOrigen: '10000000-0000-4000-8000-000000000010',
          idClaseDestino: '10000000-0000-4000-8000-000000000020',
          nombre: 'detalles',
          multiplicidadOrigen: '1',
          multiplicidadDestino: '0..*',
        },
        {
          id: '10000000-0000-4000-8000-000000000050',
          tipo: 'GENERALIZACION',
          idClaseOrigen: '10000000-0000-4000-8000-000000000040',
          idClaseDestino: '10000000-0000-4000-8000-000000000010',
          nombre: null,
          multiplicidadOrigen: null,
          multiplicidadDestino: null,
        },
      ],
    },
  };
}

describe('generarXmiEnterpriseArchitect', () => {
  it('genera XMI 2.1 con clases, tipos, operaciones y extension de diagrama EA', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain('xmlns:uml="http://www.omg.org/spec/UML/20131001"');
    expect(xmi).toContain(
      'xmlns:umldi="http://www.omg.org/spec/UML/20131001/UMLDI"',
    );
    expect(xmi).toContain(
      'xmlns:dc="http://www.omg.org/spec/UML/20131001/UMLDC"',
    );
    expect(xmi).toContain(
      '<xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>',
    );
    expect(xmi).toContain('extender="Enterprise Architect"');
    expect(xmi).toContain('name="Ventas &amp; logística"');
    expect(xmi).toContain('<body>Modelo &lt;principal&gt; para ventas</body>');
    expect(xmi).toContain('xmi:type="uml:Class"');
    expect(xmi).toContain('name="calcularTotal"');
    expect(xmi).toContain('direction="return"');
    expect(xmi).toContain('xmi:type="uml:DataType"');
    expect(xmi).toContain('name="EstadoVenta"');
    expect(xmi).toContain('<umldi:Diagram xmi:type="umldi:UMLClassDiagram"');
    expect(xmi).toContain('xmi:type="umldi:UMLClassifierShape"');
    expect(xmi).toContain('xmi:type="umldi:UMLEdge"');
    expect(xmi).toContain('xmi:type="dc:bounds"');
    expect(xmi).toContain('<diagrams>');
    expect(xmi).toContain('type="Logical"');
  });

  it('exporta operaciones y tipos de retorno con metadatos de Enterprise Architect', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain(
      '<ownedParameter xmi:type="uml:Parameter" xmi:id="EAID_RT000000_0000_4000_8000_000000000013" name="return" direction="return" type="EATYPE_A5AAF4EC"/>',
    );
    expect(xmi).toContain('<operations>');
    expect(xmi).toContain(
      '<operation xmi:idref="EAID_10000000_0000_4000_8000_000000000013" name="calcularTotal" scope="Public">',
    );
    expect(xmi).toContain(
      '<type type="Decimal" const="false" static="false" isAbstract="false" synchronised="0" concurrency="Sequential" pure="0" isQuery="false"/>',
    );
    expect(xmi).toContain(
      '<parameter xmi:idref="EAID_RETURNID_0000_4000_8000_000000000013" visibility="public">',
    );
    expect(xmi).toContain(
      '<properties pos="0" type="Decimal" const="false" ea_guid="{RETURNID-0000-4000-8000-000000000013}"/>',
    );
    expect(xmi).toContain(
      '<parameter xmi:idref="EAID_10000000_0000_4000_8000_000000000014" visibility="public">',
    );
    expect(xmi).toContain(
      '<properties pos="0" type="Double" const="false" ea_guid="{10000000-0000-4000-8000-000000000014}"/>',
    );
    expect(xmi).not.toContain('DuplicateParam_1');
  });

  it('conserva multiplicidades y composicion en la asociacion', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain('aggregation="composite"');
    expect(xmi).toContain('value="0"');
    expect(xmi).toContain('value="*"');
    expect(xmi).toContain('multiplicity="1..1"');
    expect(xmi).toContain('multiplicity="0..*"');
    expect(xmi).toContain('<labels lb="1..1" rb="0..*"/>');
    expect(xmi).toContain('name="detalles"');
  });

  it('exporta la generalizacion desde la clase origen hacia la clase destino', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain(
      '<generalization xmi:type="uml:Generalization" xmi:id="EAID_10000000_0000_4000_8000_000000000050" general="EAID_10000000_0000_4000_8000_000000000010"/>',
    );
  });

  it('incluye UMLDI con posiciones y multiplicidades para que EA reconstruya el diagrama', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain(
      'modelElement="EAPK_10000000_0000_4000_8000_000000000001"',
    );
    expect(xmi).toContain('text="1..1"');
    expect(xmi).toContain('text="0..*"');
    expect(xmi).toContain('x="50" y="50" width="316" height="96"');
    expect(xmi).toContain('source="EAID_10000000_0000_4000_8000_000000000010"');
    expect(xmi).toContain('target="EAID_10000000_0000_4000_8000_000000000020"');
  });

  it('exporta atributos escalares como 1..1 y metadatos EA no coleccion para evitar {bag}', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain(
      '<lowerValue xmi:type="uml:LiteralInteger" xmi:id="EAID_LI_LOW_10000000_0000_4000_8000_000000000011" value="1"/>',
    );
    expect(xmi).toContain(
      '<upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="EAID_LI_UP_10000000_0000_4000_8000_000000000011" value="1"/>',
    );
    expect(xmi).toContain(
      '<attribute xmi:idref="EAID_10000000_0000_4000_8000_000000000011" name="id" scope="Private">',
    );
    expect(xmi).toContain(
      '<properties type="Integer" derived="0" collection="false" static="0" duplicates="0" changeability="changeable"/>',
    );
    expect(xmi).toContain('<bounds lower="1" upper="1"/>');

    const indiceExtended = xmi.indexOf(
      '<extendedProperties tagged="0" package_name="Ventas &amp; logística"/>',
    );
    const indiceAtributos = xmi.indexOf('<attributes>', indiceExtended);
    expect(indiceExtended).toBeGreaterThanOrEqual(0);
    expect(indiceAtributos).toBeGreaterThan(indiceExtended);
  });

  it('incluye links y etiquetas EA para que las asociaciones se muestren como conectores UML completos', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain(
      '<Association xmi:id="EAID_10000000_0000_4000_8000_000000000030" start="EAID_10000000_0000_4000_8000_000000000010" end="EAID_10000000_0000_4000_8000_000000000020"/>',
    );
    expect(xmi).toContain('<labels lb="1..1" rb="0..*"/>');
  });

  it('usa dimensiones compactas adaptadas al contenido de cada clase', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain('x="50" y="50" width="316" height="96"');
    expect(xmi).toContain('width="150" height="60"');
    expect(xmi).not.toContain('width="290"');
  });

  it('no activa bookmarks de Enterprise Architect al conservar tags CASE', () => {
    const xmi = generarXmiEnterpriseArchitect(crearModelo());

    expect(xmi).toContain('name="CASE.persistente" value="true"');
    expect(xmi).toContain('name="CASE.identificador" value="id"');
    expect(xmi).toContain(
      '<extendedProperties tagged="0" package_name="Ventas &amp; logística"/>',
    );
    expect(xmi).not.toContain('<extendedProperties tagged="1"');
  });

  it('no modifica el modelo recibido', () => {
    const modelo = crearModelo();
    const antes = JSON.stringify(modelo);

    generarXmiEnterpriseArchitect(modelo);

    expect(JSON.stringify(modelo)).toBe(antes);
  });
});
