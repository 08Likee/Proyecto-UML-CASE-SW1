import type { ModeloUml } from '../models/modelo-uml';
import { validarModeloParaExportacionXmi } from './validar-modelo-exportacion-xmi';

function crearModelo(): ModeloUml {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    nombre: 'Sistema de ventas',
    descripcion: null,
    version: 1,
    estado: 'ACTIVO',
    fechaCreacion: new Date('2026-10-14T12:00:00Z'),
    fechaActualizacion: new Date('2026-10-14T12:00:00Z'),
    idProyecto: '00000000-0000-4000-8000-000000000002',
    contenido: {
      versionEsquema: 1,
      configuracion: {},
      clases: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          nombre: 'Venta',
          posicion: { x: 100, y: 100 },
          persistencia: {
            persistente: true,
            idAtributoIdentificador: '00000000-0000-4000-8000-000000000011',
          },
          atributos: [
            {
              id: '00000000-0000-4000-8000-000000000011',
              nombre: 'id',
              tipo: 'Integer',
              visibilidad: 'PRIVADA',
            },
            {
              id: '00000000-0000-4000-8000-000000000012',
              nombre: 'estado',
              tipo: 'EstadoVenta',
              visibilidad: 'PRIVADA',
            },
          ],
          operaciones: [],
        },
      ],
      relaciones: [],
    },
  };
}

describe('validarModeloParaExportacionXmi', () => {
  it('rechaza un modelo sin clases', () => {
    const modelo = crearModelo();
    modelo.contenido.clases = [];

    const resultado = validarModeloParaExportacionXmi(modelo);

    expect(resultado.valido).toBe(false);
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'XMI_SIN_CLASES' }),
      ]),
    );
  });

  it('acepta tipos personalizados y los informa como advertencia', () => {
    const resultado = validarModeloParaExportacionXmi(crearModelo());

    expect(resultado.valido).toBe(true);
    expect(resultado.advertencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          codigo: 'XMI_TIPO_PERSONALIZADO',
          mensaje: expect.stringContaining('EstadoVenta'),
        }),
      ]),
    );
    expect(resultado.resumen).toEqual({
      clases: 1,
      atributos: 2,
      operaciones: 0,
      relaciones: 0,
    });
  });

  it('documenta la convencion del extremo agregado para composicion', () => {
    const modelo = crearModelo();
    modelo.contenido.clases.push({
      id: '00000000-0000-4000-8000-000000000020',
      nombre: 'DetalleVenta',
      posicion: { x: 450, y: 100 },
      persistencia: {
        persistente: false,
        idAtributoIdentificador: null,
      },
      atributos: [],
      operaciones: [],
    });
    modelo.contenido.relaciones.push({
      id: '00000000-0000-4000-8000-000000000030',
      tipo: 'COMPOSICION',
      idClaseOrigen: modelo.contenido.clases[0].id,
      idClaseDestino: modelo.contenido.clases[1].id,
      nombre: null,
      multiplicidadOrigen: '1',
      multiplicidadDestino: '0..*',
    });

    const resultado = validarModeloParaExportacionXmi(modelo);

    expect(resultado.valido).toBe(true);
    expect(resultado.advertencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'XMI_EXTREMO_AGREGADO_ORIGEN' }),
      ]),
    );
  });

  it('bloquea una inconsistencia estructural del modelo antes de exportar', () => {
    const modelo = crearModelo();
    modelo.contenido.clases.push({
      id: '00000000-0000-4000-8000-000000000020',
      nombre: 'DetalleVenta',
      posicion: { x: 450, y: 100 },
      persistencia: {
        persistente: false,
        idAtributoIdentificador: null,
      },
      atributos: [],
      operaciones: [],
    });
    modelo.contenido.relaciones.push({
      id: '00000000-0000-4000-8000-000000000030',
      tipo: 'ASOCIACION',
      idClaseOrigen: modelo.contenido.clases[0].id,
      idClaseDestino: '00000000-0000-4000-8000-000000000099',
      nombre: null,
      multiplicidadOrigen: '1',
      multiplicidadDestino: '0..*',
    });

    const resultado = validarModeloParaExportacionXmi(modelo);

    expect(resultado.valido).toBe(false);
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'XMI_MODELO_UML_INVALIDO' }),
      ]),
    );
  });
});
