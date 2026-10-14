import { analizarImportacionXmiEnterpriseArchitect } from './analizar-importacion-xmi-enterprise-architect';
import { validarContenidoModeloUml } from './validar-contenido-modelo-uml';

const XMI_OMG = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmlns:xmi="http://www.omg.org/spec/XMI/20131001" xmlns:uml="http://www.omg.org/spec/UML/20131001">
  <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>
  <uml:Model xmi:type="uml:Model" name="EA_Model">
    <packagedElement xmi:type="uml:Package" xmi:id="PK1" name="Prueba">
      <packagedElement xmi:type="uml:PrimitiveType" xmi:id="T_STRING" name="String"/>
      <packagedElement xmi:type="uml:PrimitiveType" xmi:id="T_DOUBLE" name="Double"/>
      <packagedElement xmi:type="uml:Class" xmi:id="C_PERSONA" name="Persona" visibility="public">
        <ownedAttribute xmi:type="uml:Property" xmi:id="A_ID" name="id" visibility="private"><type xmi:idref="T_STRING"/></ownedAttribute>
        <ownedOperation xmi:id="O_NOMBRE" name="obtenerNombre" visibility="public">
          <ownedParameter xmi:id="R_NOMBRE" direction="return" type="T_STRING"/>
        </ownedOperation>
      </packagedElement>
      <packagedElement xmi:type="uml:Class" xmi:id="C_EMPLEADO" name="Empleado" visibility="public">
        <ownedAttribute xmi:id="A_SALARIO" name="salario" visibility="private"><type xmi:idref="T_DOUBLE"/></ownedAttribute>
        <ownedOperation xmi:id="O_BONO" name="calcularBono" visibility="public">
          <ownedParameter xmi:id="P_PORC" name="porcentaje" direction="in" type="T_DOUBLE"/>
          <ownedParameter xmi:id="R_BONO" direction="return" type="T_DOUBLE"/>
        </ownedOperation>
        <generalization xmi:id="G1" general="C_PERSONA"/>
      </packagedElement>
    </packagedElement>
  </uml:Model>
  <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
    <elements>
      <element xmi:idref="C_PERSONA"><tags><tag name="CASE.persistente" value="true" modelElement="C_PERSONA"/><tag name="CASE.identificador" value="id" modelElement="C_PERSONA"/></tags></element>
      <element xmi:idref="C_EMPLEADO"><tags><tag name="CASE.persistente" value="false" modelElement="C_EMPLEADO"/></tags></element>
    </elements>
    <connectors>
      <connector xmi:idref="G1"><source xmi:idref="C_EMPLEADO"><type aggregation="none"/></source><target xmi:idref="C_PERSONA"><type aggregation="none"/></target><properties ea_type="Generalization"/></connector>
    </connectors>
    <diagrams><diagram><elements><element subject="C_PERSONA" geometry="Left=50;Top=60;Right=200;Bottom=140;"/><element subject="C_EMPLEADO" geometry="Left=400;Top=70;Right=550;Bottom=150;"/></elements></diagram></diagrams>
  </xmi:Extension>
</xmi:XMI>`;

const XMI_EA_21 = `<?xml version="1.0" encoding="windows-1252"?>
<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:thecustomprofile="http://example/profile">
  <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>
  <uml:Model xmi:type="uml:Model" name="EA_Model">
    <packagedElement xmi:type="uml:Package" xmi:id="PK" name="RRHH">
      <packagedElement xmi:type="uml:Class" xmi:id="P" name="Persona" visibility="public">
        <ownedAttribute xmi:id="" name="nombre" visibility="private"><type xmi:idref="EAJava_String"/></ownedAttribute>
      </packagedElement>
      <packagedElement xmi:type="uml:Class" xmi:id="E" name="Empleado" visibility="public">
        <ownedOperation xmi:id="OB" name="calcularBono" visibility="public">
          <ownedParameter xmi:id="P1" name="porcentaje" direction="in" type="EAJava_Double"/>
          <ownedParameter xmi:id="P2" name="DuplicateParam_1" direction="return" type="EAJava_Double"/>
        </ownedOperation>
      </packagedElement>
      <packagedElement xmi:type="uml:Association" xmi:id="A1">
        <ownedEnd xmi:id="A1S" aggregation="shared"><type xmi:idref="P"/><lowerValue value="1"/><upperValue value="1"/></ownedEnd>
        <ownedEnd xmi:id="A1T" aggregation="none"><type xmi:idref="E"/><lowerValue value="0"/><upperValue value="-1"/></ownedEnd>
      </packagedElement>
    </packagedElement>
    <thecustomprofile:CASE.persistente base_Class="P" CASE.persistente="false"/>
    <thecustomprofile:CASE.persistente base_Class="E" CASE.persistente="false"/>
  </uml:Model>
  <xmi:Extension extender="Enterprise Architect"><connectors><connector xmi:idref="A1"><source xmi:idref="P"><type multiplicity="1..1" aggregation="shared"/></source><target xmi:idref="E"><type multiplicity="0..*" aggregation="none"/></target><properties ea_type="Aggregation"/></connector></connectors><diagrams><diagram><elements><element subject="P" geometry="Left=10;Top=20;Right=160;Bottom=80;"/><element subject="E" geometry="Left=300;Top=30;Right=450;Bottom=90;"/></elements></diagram></diagrams></xmi:Extension>
</xmi:XMI>`;

describe('analizarImportacionXmiEnterpriseArchitect', () => {
  it('interpreta clases, operaciones, retorno, generalización y metadata CASE', () => {
    const resultado = analizarImportacionXmiEnterpriseArchitect(Buffer.from(XMI_OMG));
    expect(resultado.validacion.valido).toBe(true);
    expect(resultado.validacion.resumen).toEqual({ clases: 2, atributos: 2, operaciones: 2, relaciones: 1 });
    const contenido = validarContenidoModeloUml(resultado.contenido);
    const persona = contenido.clases.find((clase) => clase.nombre === 'Persona')!;
    const empleado = contenido.clases.find((clase) => clase.nombre === 'Empleado')!;
    expect(persona.posicion).toEqual({ x: 50, y: 60 });
    expect(persona.persistencia.persistente).toBe(true);
    expect(persona.persistencia.idAtributoIdentificador).toBe(persona.atributos[0].id);
    expect(empleado.operaciones[0].parametros[0]).toMatchObject({ nombre: 'porcentaje', tipo: 'Double' });
    expect(empleado.operaciones[0].tipoRetorno).toBe('Double');
    expect(contenido.relaciones[0]).toMatchObject({ tipo: 'GENERALIZACION', idClaseOrigen: empleado.id, idClaseDestino: persona.id });
  });

  it('interpreta el retorno renombrado por EA y una agregación 1 a 0..*', () => {
    const buffer = Buffer.from(XMI_EA_21, 'latin1');
    const resultado = analizarImportacionXmiEnterpriseArchitect(buffer);
    expect(resultado.validacion.valido).toBe(true);
    expect(resultado.validacion.nombreSugerido).toBe('RRHH');
    const contenido = resultado.contenido!;
    const empleado = contenido.clases.find((clase) => clase.nombre === 'Empleado')!;
    expect(empleado.operaciones[0].parametros).toHaveLength(1);
    expect(empleado.operaciones[0].parametros[0].nombre).toBe('porcentaje');
    expect(empleado.operaciones[0].tipoRetorno).toBe('Double');
    expect(contenido.relaciones[0]).toMatchObject({ tipo: 'AGREGACION', multiplicidadOrigen: '1', multiplicidadDestino: '0..*' });
  });

  it('genera layout determinista si el XMI no contiene geometría', () => {
    const resultado = analizarImportacionXmiEnterpriseArchitect(Buffer.from(XMI_OMG.replace(/<diagrams>[\s\S]*?<\/diagrams>/, '')));
    expect(resultado.validacion.valido).toBe(true);
    expect(resultado.validacion.advertencias.some((item) => item.codigo === 'LAYOUT_AUTOMATICO')).toBe(true);
    expect(resultado.contenido!.clases[0].posicion).toEqual({ x: 80, y: 80 });
  });

  it('advierte cuando no existe metadata de persistencia', () => {
    const xml = XMI_OMG.replace(/<elements>[\s\S]*?<\/elements>/, '<elements/>');
    const resultado = analizarImportacionXmiEnterpriseArchitect(Buffer.from(xml));
    expect(resultado.validacion.valido).toBe(true);
    expect(resultado.validacion.advertencias.some((item) => item.codigo === 'PERSISTENCIA_NO_ESPECIFICADA')).toBe(true);
  });

  it('bloquea multiplicidades que el modelo interno no puede representar', () => {
    const xml = XMI_EA_21.replace('multiplicity="0..*"', 'multiplicity="2..5"');
    const resultado = analizarImportacionXmiEnterpriseArchitect(Buffer.from(xml, 'latin1'));
    expect(resultado.validacion.valido).toBe(false);
    expect(resultado.validacion.errores.some((item) => item.codigo === 'MULTIPLICIDAD_NO_SOPORTADA')).toBe(true);
  });

  it('rechaza DTD y entidades', () => {
    const xml = XMI_OMG.replace('<xmi:XMI', '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><xmi:XMI');
    const resultado = analizarImportacionXmiEnterpriseArchitect(Buffer.from(xml));
    expect(resultado.validacion.valido).toBe(false);
    expect(resultado.validacion.errores[0].codigo).toBe('XMI_NO_INTERPRETABLE');
  });

  it('rechaza XML mal formado', () => {
    const resultado = analizarImportacionXmiEnterpriseArchitect(Buffer.from('<xmi:XMI><uml:Model></xmi:XMI>'));
    expect(resultado.validacion.valido).toBe(false);
    expect(resultado.validacion.errores[0].codigo).toBe('XMI_NO_INTERPRETABLE');
  });

  it('rechaza un XMI sin clases compatibles', () => {
    const resultado = analizarImportacionXmiEnterpriseArchitect(Buffer.from('<?xml version="1.0"?><xmi:XMI xmlns:xmi="x"><uml:Model/></xmi:XMI>'));
    expect(resultado.validacion.valido).toBe(false);
    expect(resultado.validacion.errores.some((item) => item.codigo === 'SIN_CLASES')).toBe(true);
  });
});
