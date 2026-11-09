import { randomUUID } from 'node:crypto';
import { aplicarPropuestaAlContenido } from './aplicar-propuesta-uml-ia';
import { validarContenidoModeloUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/services/validar-contenido-modelo-uml';
import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import type { CambiosPropuestosUml } from '../models/propuesta-uml-ia';
import { actualizarEstadoYjsPropuesta } from '../../infrastructure/collaboration/actualizar-estado-yjs-propuesta';
import * as Y from 'yjs';

const idVenta = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const idAtributo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const contenido: ModeloUmlContenido = {
  versionEsquema: 1, configuracion: { otro: 'metadato' },
  clases: [{
    id: idVenta, nombre: 'Venta', atributos: [{ id: idAtributo, nombre: 'id', tipo: 'Integer', visibilidad: 'PRIVADA' }],
    operaciones: [], posicion: { x: 100, y: 80 }, persistencia: { persistente: false, idAtributoIdentificador: null },
  }], relaciones: [],
};
const cambios: CambiosPropuestosUml = {
  resumen: 'Se agrega Factura',
  clasesNuevas: [{ nombre: 'Factura', atributos: [{ nombre: 'numero', tipo: 'String', visibilidad: 'PRIVADA' }] }],
  atributosEnClasesExistentes: [{ clase: 'Venta', atributos: [{ nombre: 'total', tipo: 'Double', visibilidad: 'PRIVADA' }] }],
  relacionesNuevas: [{ tipo: 'ASOCIACION', claseOrigen: 'Venta', claseDestino: 'Factura', nombre: null, multiplicidadOrigen: '1', multiplicidadDestino: '0..1' }],
};

describe('CU13 bloque 8.2 — materialización y sincronización Yjs', () => {
  it('genera clases, atributos y relaciones válidas con UUID y sin mutar el original', () => {
    const nuevo = validarContenidoModeloUml(aplicarPropuestaAlContenido(contenido, cambios, randomUUID));
    expect(nuevo.clases).toHaveLength(2);
    expect(nuevo.clases[0].atributos.map((a) => a.nombre)).toEqual(['id', 'total']);
    expect(nuevo.clases[1].atributos.map((a) => a.nombre)).toEqual(['numero']);
    expect(nuevo.clases[1].posicion).not.toEqual(nuevo.clases[0].posicion);
    expect(nuevo.relaciones[0]).toEqual(expect.objectContaining({
      idClaseOrigen: idVenta, idClaseDestino: nuevo.clases[1].id,
      multiplicidadOrigen: '1', multiplicidadDestino: '0..1',
    }));
    expect(contenido.clases).toHaveLength(1);
    expect(contenido.clases[0].atributos).toHaveLength(1);
  });

  it('produce snapshot Yjs inicial que conserva las adiciones aprobadas', () => {
    const siguiente = aplicarPropuestaAlContenido(contenido, cambios);
    const base64 = actualizarEstadoYjsPropuesta(contenido, siguiente, null);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(base64, 'base64'));
    expect(doc.getMap('modelo-uml').get('contenido')).toBeInstanceOf(Y.Map);
    const root = doc.getMap('modelo-uml').get('contenido') as Y.Map<unknown>;
    const clases = root.get('clases') as Y.Array<Y.Map<unknown>>;
    const relaciones = root.get('relaciones') as Y.Array<Y.Map<unknown>>;
    expect(clases.length).toBe(2);
    expect(relaciones.length).toBe(1);
    expect((clases.get(0).get('atributos') as Y.Array<unknown>).length).toBe(2);
    doc.destroy();
  });

  it('fusiona nuevas adiciones en un CRDT existente, sin perder la sesión colaborativa', () => {
    const siguiente = aplicarPropuestaAlContenido(contenido, cambios);
    const base = actualizarEstadoYjsPropuesta(contenido, contenido, null);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(base, 'base64'));
    doc.getMap('modelo-uml-sesion').set('metadata', 'conservar');
    const persistido = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64');
    const actualizado = actualizarEstadoYjsPropuesta(contenido, siguiente, persistido);
    const remoto = new Y.Doc();
    Y.applyUpdate(remoto, Buffer.from(actualizado, 'base64'));
    expect(remoto.getMap('modelo-uml-sesion').get('metadata')).toBe('conservar');
    expect(((remoto.getMap('modelo-uml').get('contenido') as Y.Map<unknown>).get('clases') as Y.Array<unknown>).length).toBe(2);
    doc.destroy(); remoto.destroy();
  });

  it('rechaza un snapshot Yjs divergente, sin publicar estados corruptos', () => {
    const siguiente = aplicarPropuestaAlContenido(contenido, cambios);
    const otroContenido = { ...contenido, clases: [] };
    const diferente = actualizarEstadoYjsPropuesta(otroContenido, otroContenido, null);
    expect(() => actualizarEstadoYjsPropuesta(contenido, siguiente, diferente)).toThrow('snapshot colaborativo difiere');
  });
});
