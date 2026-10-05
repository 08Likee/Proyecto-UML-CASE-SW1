import { randomUUID } from 'node:crypto';
import type { ModeloUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import { validarModeloParaGeneracion } from './validar-modelo-generacion';

function modeloBase(): ModeloUml {
  const idClase = randomUUID();
  const idAtributo = randomUUID();
  return {
    id: randomUUID(),
    nombre: 'Ventas',
    descripcion: null,
    version: 1,
    estado: 'ACTIVO',
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    idProyecto: randomUUID(),
    contenido: {
      versionEsquema: 1,
      clases: [
        {
          id: idClase,
          nombre: 'Cliente',
          posicion: { x: 0, y: 0 },
          atributos: [
            {
              id: idAtributo,
              nombre: 'id',
              tipo: 'Long',
              visibilidad: 'PRIVADA',
            },
          ],
          operaciones: [],
          persistencia: {
            persistente: true,
            idAtributoIdentificador: idAtributo,
          },
        },
      ],
      relaciones: [],
      configuracion: {},
    },
  };
}

describe('validarModeloParaGeneracion', () => {
  it('acepta un modelo persistente correctamente especificado', () => {
    const resultado = validarModeloParaGeneracion(modeloBase());
    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it('rechaza una clase persistente sin identificador', () => {
    const modelo = modeloBase();
    modelo.contenido.clases[0].persistencia.idAtributoIdentificador = null;
    const resultado = validarModeloParaGeneracion(modelo);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'IDENTIFICADOR_FALTANTE' }),
      ]),
    );
  });

  it('rechaza tipos personalizados que no pueden transformarse con seguridad', () => {
    const modelo = modeloBase();
    modelo.contenido.clases[0].atributos.push({
      id: randomUUID(),
      nombre: 'saldo',
      tipo: 'Money',
      visibilidad: 'PRIVADA',
    });
    const resultado = validarModeloParaGeneracion(modelo);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'TIPO_NO_SOPORTADO' }),
      ]),
    );
  });

  it('deja operaciones personalizadas pendientes sin bloquear el modelo', () => {
    const modelo = modeloBase();
    modelo.contenido.clases[0].operaciones.push({
      id: randomUUID(),
      nombre: 'calcularDescuento',
      visibilidad: 'PUBLICA',
      parametros: [],
      tipoRetorno: 'Decimal',
    });
    const resultado = validarModeloParaGeneracion(modelo);
    expect(resultado.valido).toBe(true);
    expect(resultado.operacionesPendientes).toHaveLength(1);
  });
  it('rechaza una FK manual que el generador debe derivar de la relación', () => {
    const modelo = modeloBase();
    const cliente = modelo.contenido.clases[0];
    const idPedido = randomUUID();
    const idPedidoPk = randomUUID();
    modelo.contenido.clases.push({
      id: idPedido,
      nombre: 'Pedido',
      posicion: { x: 0, y: 0 },
      atributos: [
        {
          id: idPedidoPk,
          nombre: 'id',
          tipo: 'Long',
          visibilidad: 'PRIVADA',
        },
        {
          id: randomUUID(),
          nombre: 'clienteId',
          tipo: 'Long',
          visibilidad: 'PRIVADA',
        },
      ],
      operaciones: [],
      persistencia: {
        persistente: true,
        idAtributoIdentificador: idPedidoPk,
      },
    });
    modelo.contenido.relaciones.push({
      id: randomUUID(),
      tipo: 'ASOCIACION',
      idClaseOrigen: cliente.id,
      idClaseDestino: idPedido,
      nombre: null,
      multiplicidadOrigen: '1',
      multiplicidadDestino: '0..*',
    });

    const resultado = validarModeloParaGeneracion(modelo);

    expect(resultado.valido).toBe(false);
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'RELACION_COLISION_DTO' }),
      ]),
    );
  });
  it('advierte cuando una relación muchos a muchos requiere CRUD independiente', () => {
    const modelo = modeloBase();
    const cliente = modelo.contenido.clases[0];
    const idProducto = randomUUID();
    const idProductoPk = randomUUID();
    modelo.contenido.clases.push({
      id: idProducto,
      nombre: 'Producto',
      posicion: { x: 0, y: 0 },
      atributos: [
        {
          id: idProductoPk,
          nombre: 'id',
          tipo: 'Long',
          visibilidad: 'PRIVADA',
        },
      ],
      operaciones: [],
      persistencia: {
        persistente: true,
        idAtributoIdentificador: idProductoPk,
      },
    });
    modelo.contenido.relaciones.push({
      id: randomUUID(),
      tipo: 'ASOCIACION',
      idClaseOrigen: cliente.id,
      idClaseDestino: idProducto,
      nombre: 'productos',
      multiplicidadOrigen: '0..*',
      multiplicidadDestino: '0..*',
    });

    const resultado = validarModeloParaGeneracion(modelo);

    expect(resultado.valido).toBe(true);
    expect(resultado.advertencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'MANY_TO_MANY_TABLA_UNION' }),
      ]),
    );
  });
});
