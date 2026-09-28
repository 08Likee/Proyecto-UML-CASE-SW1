import type { ModeloUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import { transformarModeloABackend } from './transformar-modelo-backend';

function crearModeloConRelacion(
  multiplicidadOrigen: '1' | '0..*',
  multiplicidadDestino: '1' | '0..*',
): ModeloUml {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    nombre: 'Sistema Ventas',
    descripcion: null,
    version: 1,
    estado: 'ACTIVO',
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00.000Z'),
    idProyecto: '00000000-0000-4000-8000-000000000002',
    contenido: {
      versionEsquema: 1,
      configuracion: {},
      clases: [
        {
          id: 'cliente',
          nombre: 'Cliente',
          posicion: { x: 0, y: 0 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: 'cliente-id',
          },
          atributos: [
            {
              id: 'cliente-id',
              nombre: 'id',
              tipo: 'Long',
              visibilidad: 'PRIVADA',
            },
          ],
          operaciones: [],
        },
        {
          id: 'pedido',
          nombre: 'Pedido',
          posicion: { x: 0, y: 0 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: 'pedido-id',
          },
          atributos: [
            {
              id: 'pedido-id',
              nombre: 'id',
              tipo: 'Long',
              visibilidad: 'PRIVADA',
            },
          ],
          operaciones: [],
        },
      ],
      relaciones: [
        {
          id: 'relacion',
          tipo: 'ASOCIACION',
          idClaseOrigen: 'cliente',
          idClaseDestino: 'pedido',
          nombre: 'pedidos',
          multiplicidadOrigen,
          multiplicidadDestino,
        },
      ],
    },
  };
}

describe('transformarModeloABackend', () => {
  it('ubica la FK en el extremo muchos de una relación uno a muchos', () => {
    const especificacion = transformarModeloABackend(
      crearModeloConRelacion('1', '0..*'),
      [],
    );

    const cliente = especificacion.entidades.find(
      (entidad) => entidad.nombre === 'Cliente',
    )!;
    const pedido = especificacion.entidades.find(
      (entidad) => entidad.nombre === 'Pedido',
    )!;

    expect(cliente.relaciones).toEqual([]);
    expect(pedido.relaciones).toEqual([
      {
        nombreCampo: 'cliente',
        entidadDestino: 'Cliente',
        tipo: 'MANY_TO_ONE',
      },
    ]);
  });

  it('mantiene el extremo muchos como propietario cuando ya es el origen', () => {
    const modelo = crearModeloConRelacion('0..*', '1');
    modelo.contenido.relaciones[0].idClaseOrigen = 'pedido';
    modelo.contenido.relaciones[0].idClaseDestino = 'cliente';

    const especificacion = transformarModeloABackend(modelo, []);
    const pedido = especificacion.entidades.find(
      (entidad) => entidad.nombre === 'Pedido',
    )!;

    expect(pedido.relaciones).toEqual([
      {
        nombreCampo: 'cliente',
        entidadDestino: 'Cliente',
        tipo: 'MANY_TO_ONE',
      },
    ]);
  });
});
