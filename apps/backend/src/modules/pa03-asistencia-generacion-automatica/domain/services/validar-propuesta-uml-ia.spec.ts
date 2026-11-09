import type { ModeloUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import { validarPropuestaUmlIa, PropuestaUmlInvalidaError } from './validar-propuesta-uml-ia';

const modelo: ModeloUml = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  idProyecto: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', nombre: 'Sistema de ventas',
  descripcion: null, version: 7, estado: 'ACTIVO',
  fechaCreacion: new Date(), fechaActualizacion: new Date(),
  contenido: { versionEsquema: 1, configuracion: { __colaboracion: { secret: 'omit' } },
    clases: [
      { id: 'c1', nombre: 'Cliente', posicion: { x: 1, y: 2 }, operaciones: [], persistencia: { persistente: false, idAtributoIdentificador: null }, atributos: [{ id: 'a1', nombre: 'email', tipo: 'String', visibilidad: 'PRIVADA' }] },
      { id: 'c2', nombre: 'Venta', posicion: { x: 2, y: 3 }, operaciones: [], persistencia: { persistente: false, idAtributoIdentificador: null }, atributos: [] },
    ],
    relaciones: [{ id: 'r1', tipo: 'ASOCIACION', idClaseOrigen: 'c1', idClaseDestino: 'c2', nombre: null, multiplicidadOrigen: '1', multiplicidadDestino: '0..*' }],
  },
};
const atributo = { nombre: 'numero', tipo: 'String', visibilidad: 'PRIVADA' };
const propuesta = {
  resumen: 'Agregar Factura asociada a Venta.',
  clasesNuevas: [{ nombre: 'Factura', atributos: [atributo] }],
  atributosEnClasesExistentes: [],
  relacionesNuevas: [{ tipo: 'ASOCIACION', claseOrigen: 'Venta', claseDestino: 'Factura', nombre: null, multiplicidadOrigen: '1', multiplicidadDestino: '0..1' }],
};

describe('CU13 bloque 8.1 — validar propuesta UML sin ejecutarla', () => {
  it('valida una clase y asociación nueva sin copiar campos no autorizados del modelo', () => {
    const resultado = validarPropuestaUmlIa(propuesta, modelo);
    expect(resultado.clasesNuevas[0].nombre).toBe('Factura');
    expect(resultado.relacionesNuevas[0].multiplicidadDestino).toBe('0..1');
    expect(JSON.stringify(resultado)).not.toContain('__colaboracion');
  });
  it('rechaza clases ya presentes o repetidas', () => {
    expect(() => validarPropuestaUmlIa({ ...propuesta, clasesNuevas: [{ ...propuesta.clasesNuevas[0], nombre: 'cliente' }] }, modelo)).toThrow(PropuestaUmlInvalidaError);
    expect(() => validarPropuestaUmlIa({ ...propuesta, clasesNuevas: [propuesta.clasesNuevas[0], propuesta.clasesNuevas[0]] }, modelo)).toThrow(PropuestaUmlInvalidaError);
  });
  it('rechaza atributos repetidos o ya presentes', () => {
    const datos = { ...propuesta, atributosEnClasesExistentes: [{ clase: 'Cliente', atributos: [{ ...atributo, nombre: 'email' }] }] };
    expect(() => validarPropuestaUmlIa(datos, modelo)).toThrow(PropuestaUmlInvalidaError);
    expect(() => validarPropuestaUmlIa({ ...propuesta, clasesNuevas: [{ nombre: 'Factura', atributos: [atributo, atributo] }] }, modelo)).toThrow(PropuestaUmlInvalidaError);
  });
  it('rechaza relaciones con referencias inexistentes y asociaciones duplicadas', () => {
    expect(() => validarPropuestaUmlIa({ ...propuesta, relacionesNuevas: [{ ...propuesta.relacionesNuevas[0], claseDestino: 'Desconocida' }] }, modelo)).toThrow(PropuestaUmlInvalidaError);
    expect(() => validarPropuestaUmlIa({ ...propuesta, relacionesNuevas: [{ ...propuesta.relacionesNuevas[0], claseOrigen: 'Cliente', claseDestino: 'Venta' }] }, modelo)).toThrow(PropuestaUmlInvalidaError);
  });
  it('exige multiplicidades válidas y generalización sin multiplicidades', () => {
    expect(() => validarPropuestaUmlIa({ ...propuesta, relacionesNuevas: [{ ...propuesta.relacionesNuevas[0], multiplicidadDestino: '4..7' }] }, modelo)).toThrow(PropuestaUmlInvalidaError);
    expect(() => validarPropuestaUmlIa({ ...propuesta, relacionesNuevas: [{ ...propuesta.relacionesNuevas[0], tipo: 'GENERALIZACION' }] }, modelo)).toThrow(PropuestaUmlInvalidaError);
  });
  it('admite texto descriptivo Unicode sin fragmentarlo y rechaza caracteres ASCII de control', () => {
    const resumen = 'Agregar Factura 🧾 para emitir comprobantes.';
    expect(validarPropuestaUmlIa({ ...propuesta, resumen }, modelo).resumen).toBe(resumen);
    expect(() => validarPropuestaUmlIa({ ...propuesta, resumen: 'Texto\u007foculto' }, modelo)).toThrow(PropuestaUmlInvalidaError);
  });
  it('rechaza campos extra, esquemas vacíos, exceso de cambios y caracteres de control', () => {
    expect(() => validarPropuestaUmlIa({ ...propuesta, ejecutar: 'DROP TABLE modelo_uml' }, modelo)).toThrow(PropuestaUmlInvalidaError);
    expect(() => validarPropuestaUmlIa({ ...propuesta, clasesNuevas: [], relacionesNuevas: [] }, modelo)).toThrow(PropuestaUmlInvalidaError);
    expect(() => validarPropuestaUmlIa({ ...propuesta, resumen: 'Mal\nicioso' }, modelo)).toThrow(PropuestaUmlInvalidaError);
    expect(() => validarPropuestaUmlIa({ ...propuesta, clasesNuevas: Array.from({ length: 4 }, (_, i) => ({ nombre: `Factura${i}`, atributos: [] })) }, modelo)).toThrow(PropuestaUmlInvalidaError);
  });
});
