import { randomUUID } from 'crypto';
import { ModeloUmlInvalidoError } from '../errors/modelo-uml-invalido.error';
import { crearContenidoModeloUmlVacio } from '../models/modelo-uml';
import { validarContenidoModeloUml } from './validar-contenido-modelo-uml';

describe('validarContenidoModeloUml', () => {
  it('acepta un modelo vacio canonico', () => {
    const contenido = crearContenidoModeloUmlVacio();

    expect(validarContenidoModeloUml(contenido)).toEqual(contenido);
  });

  it('acepta clases, atributos, operaciones, persistencia y asociaciones', () => {
    const idCliente = randomUUID();
    const idPedido = randomUUID();
    const idClientePk = randomUUID();
    const idPedidoPk = randomUUID();

    const contenido = {
      versionEsquema: 1,
      configuracion: {},
      clases: [
        {
          id: idCliente,
          nombre: 'Cliente',
          posicion: { x: 120, y: 80 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: idClientePk,
          },
          atributos: [
            {
              id: idClientePk,
              nombre: 'id',
              tipo: 'Long',
              visibilidad: 'PRIVADA',
            },
          ],
          operaciones: [
            {
              id: randomUUID(),
              nombre: 'buscarPedido',
              visibilidad: 'PUBLICA',
              tipoRetorno: 'Pedido',
              parametros: [
                {
                  id: randomUUID(),
                  nombre: 'idPedido',
                  tipo: 'Long',
                },
              ],
            },
          ],
        },
        {
          id: idPedido,
          nombre: 'Pedido',
          posicion: { x: 520, y: 80 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: idPedidoPk,
          },
          atributos: [
            {
              id: idPedidoPk,
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
          id: randomUUID(),
          tipo: 'ASOCIACION',
          idClaseOrigen: idCliente,
          idClaseDestino: idPedido,
          nombre: 'pedidos',
          multiplicidadOrigen: '1',
          multiplicidadDestino: '0..*',
        },
      ],
    };

    expect(() => validarContenidoModeloUml(contenido)).not.toThrow();
  });

  it('rechaza un identificador que no pertenece a la clase', () => {
    const contenido = {
      versionEsquema: 1,
      configuracion: {},
      clases: [
        {
          id: randomUUID(),
          nombre: 'Cliente',
          posicion: { x: 0, y: 0 },
          atributos: [],
          operaciones: [],
          persistencia: {
            persistente: true,
            idAtributoIdentificador: randomUUID(),
          },
        },
      ],
      relaciones: [],
    };

    expect(() => validarContenidoModeloUml(contenido)).toThrow(
      ModeloUmlInvalidoError,
    );
  });

  it('rechaza una relacion hacia una clase inexistente', () => {
    const idClase = randomUUID();
    const contenido = {
      versionEsquema: 1,
      configuracion: {},
      clases: [
        {
          id: idClase,
          nombre: 'Cliente',
          posicion: { x: 0, y: 0 },
          atributos: [],
          operaciones: [],
          persistencia: {
            persistente: false,
            idAtributoIdentificador: null,
          },
        },
      ],
      relaciones: [
        {
          id: randomUUID(),
          tipo: 'ASOCIACION',
          idClaseOrigen: idClase,
          idClaseDestino: randomUUID(),
          nombre: null,
          multiplicidadOrigen: '1',
          multiplicidadDestino: '0..*',
        },
      ],
    };

    expect(() => validarContenidoModeloUml(contenido)).toThrow(
      ModeloUmlInvalidoError,
    );
  });

  it('rechaza multiplicidades fuera del subconjunto soportado', () => {
    const idOrigen = randomUUID();
    const idDestino = randomUUID();
    const clase = (id: string, nombre: string) => ({
      id,
      nombre,
      posicion: { x: 0, y: 0 },
      atributos: [],
      operaciones: [],
      persistencia: {
        persistente: false,
        idAtributoIdentificador: null,
      },
    });

    const contenido = {
      versionEsquema: 1,
      configuracion: {},
      clases: [clase(idOrigen, 'Origen'), clase(idDestino, 'Destino')],
      relaciones: [
        {
          id: randomUUID(),
          tipo: 'ASOCIACION',
          idClaseOrigen: idOrigen,
          idClaseDestino: idDestino,
          nombre: null,
          multiplicidadOrigen: '2..5',
          multiplicidadDestino: '1',
        },
      ],
    };

    expect(() => validarContenidoModeloUml(contenido)).toThrow(
      ModeloUmlInvalidoError,
    );
  });
});
