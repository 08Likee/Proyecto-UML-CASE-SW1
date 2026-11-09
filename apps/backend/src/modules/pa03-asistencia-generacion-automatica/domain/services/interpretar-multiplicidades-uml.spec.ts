import type { ModeloUml, MultiplicidadUml, RelacionUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import { interpretarRelacionesUml, resumenRelacionesVerificadas } from './interpretar-multiplicidades-uml';

const base: ModeloUml = {
  id: 'm1', idProyecto: 'p1', nombre: 'Sistema de ventas', descripcion: null,
  estado: 'ACTIVO', version: 20, fechaCreacion: new Date(), fechaActualizacion: new Date(),
  contenido: {
    versionEsquema: 1,
    clases: [
      { id: 'venta', nombre: 'Venta', atributos: [], operaciones: [], posicion: { x: 0, y: 0 }, persistencia: { persistente: false, idAtributoIdentificador: null } },
      { id: 'cliente', nombre: 'Cliente', atributos: [], operaciones: [], posicion: { x: 10, y: 10 }, persistencia: { persistente: false, idAtributoIdentificador: null } },
      { id: 'factura', nombre: 'Factura', atributos: [], operaciones: [], posicion: { x: 20, y: 20 }, persistencia: { persistente: false, idAtributoIdentificador: null } },
    ],
    relaciones: [{ id: 'r1', tipo: 'ASOCIACION', idClaseOrigen: 'venta', idClaseDestino: 'cliente', nombre: null, multiplicidadOrigen: '0..*', multiplicidadDestino: '1' }],
    configuracion: {},
  },
};

function modeloConRelaciones(relaciones: RelacionUml[]): ModeloUml {
  return { ...base, contenido: { ...base.contenido, relaciones } };
}

function relacion(origen: MultiplicidadUml | null, destino: MultiplicidadUml | null): RelacionUml {
  return { ...base.contenido.relaciones[0], multiplicidadOrigen: origen, multiplicidadDestino: destino };
}

describe('CU13: lectura determinista de multiplicidades UML', () => {
  it('interpreta el modelo real: Venta(0..*) — Cliente(1) sin invertir los extremos', () => {
    const [l] = interpretarRelacionesUml(base);
    expect(l.cantidadDestinosPorOrigen).toBe('1');
    expect(l.cantidadOrigenesPorDestino).toBe('0..*');
    expect(l.desdeOrigen).toBe('Cada instancia de «Venta» se relaciona con exactamente una instancia de «Cliente».');
    expect(l.desdeDestino).toBe('Cada instancia de «Cliente» se relaciona con cero o más instancias de «Venta».');
    const resumen = resumenRelacionesVerificadas(base, 'Explica qué representa la clase cliente en este modelo.');
    expect(resumen).toContain(l.desdeOrigen);
    expect(resumen).toContain(l.desdeDestino);
  });

  it('al intercambiar origen y destino conserva la semántica de cada clase', () => {
    const invertida = modeloConRelaciones([{
      ...relacion('1', '0..*'), idClaseOrigen: 'cliente', idClaseDestino: 'venta',
    }]);
    const [l] = interpretarRelacionesUml(invertida);
    expect(l.desdeOrigen).toContain('Cada instancia de «Cliente» se relaciona con cero o más instancias de «Venta».');
    expect(l.desdeDestino).toContain('Cada instancia de «Venta» se relaciona con exactamente una instancia de «Cliente».');
  });

  it('expresa correctamente 0..1, 1..*, y el alias *', () => {
    const a = interpretarRelacionesUml(modeloConRelaciones([relacion('0..1', '1..*')]))[0];
    expect(a.desdeOrigen).toContain('una o más instancias de «Cliente»');
    expect(a.desdeDestino).toContain('cero o una instancia de «Venta»');
    const b = interpretarRelacionesUml(modeloConRelaciones([relacion('*', '1')]))[0];
    expect(b.desdeDestino).toContain('cero o más instancias de «Venta»');
  });

  it('no afirma cardinalidades en generalización, multiplicidad ausente ni extremos inexistentes', () => {
    expect(interpretarRelacionesUml(modeloConRelaciones([
      { ...relacion(null, null), tipo: 'GENERALIZACION' },
      relacion(null, '1'),
      { ...relacion('0..*', '1'), idClaseDestino: 'no-existe' },
      { ...relacion('0..*', '1'), idClaseDestino: 'venta' },
    ]))).toEqual([]);
  });

  it('filtra por clase nombrada y no confunde Cliente con ClientePremium', () => {
    expect(resumenRelacionesVerificadas(base, '¿Qué es ClientePremium?')).toBeNull();
    expect(resumenRelacionesVerificadas(base, '¿Qué es una clase UML?')).toBeNull();
    expect(resumenRelacionesVerificadas(base, 'Revisa las multiplicidades del modelo')).toContain('Venta');
    const dosRelaciones = modeloConRelaciones([
      relacion('0..*', '1'),
      { ...relacion('1', '0..1'), id: 'r2', idClaseDestino: 'factura' },
    ]);
    expect(resumenRelacionesVerificadas(dosRelaciones, 'Analiza la clase Cliente')).not.toContain('Factura');
  });

  it('limita el texto derivado para no saturar la respuesta', () => {
    const relaciones = Array.from({ length: 12 }, (_, i) => ({ ...relacion('1', '0..*'), id: `r${i}` }));
    const resumen = resumenRelacionesVerificadas(modeloConRelaciones(relaciones), 'analiza las asociaciones');
    expect(resumen?.match(/\*\*ASOCIACION/g)).toHaveLength(8);
    expect(resumen).toContain('Se muestran 8 de 12');
  });
});
