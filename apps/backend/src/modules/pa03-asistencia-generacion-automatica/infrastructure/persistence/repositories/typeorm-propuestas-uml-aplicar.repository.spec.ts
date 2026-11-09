import { DataSource } from 'typeorm';
import { TypeOrmPropuestasUmlIaRepository } from './typeorm-propuestas-uml-ia.repository';
import { actualizarEstadoYjsPropuesta } from '../../collaboration/actualizar-estado-yjs-propuesta';
import { AplicacionPropuestaConflictivaError } from '../../../domain/errors/aplicacion-propuesta-conflictiva.error';
import type { ModeloUmlContenido } from '../../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';

const p = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const m = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const c = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const u = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const propuestaId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const claseId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const contenido: ModeloUmlContenido = {
  versionEsquema: 1, configuracion: {},
  clases: [{ id: claseId, nombre: 'Venta', atributos: [], operaciones: [], posicion: { x: 10, y: 10 }, persistencia: { persistente: false, idAtributoIdentificador: null } }],
  relaciones: [],
};
const estadoYjsBase64 = actualizarEstadoYjsPropuesta(contenido, contenido, null);
const contenidoPersistido: ModeloUmlContenido = {
  ...contenido, configuracion: { __colaboracion: { formato: 1, estadoYjsBase64 } },
};
const fila = {
  id: propuestaId, idProyecto: p, idModelo: m, idConversacion: c,
  idCreador: u, idMensajeUsuario: u, versionModelo: 14, versionActual: 14,
  estado: 'PENDIENTE', datos: {
    resumen: 'Agregar Categoria',
    clasesNuevas: [{ nombre: 'Categoria', atributos: [{ nombre: 'nombre', tipo: 'String', visibilidad: 'PRIVADA' }] }],
    atributosEnClasesExistentes: [], relacionesNuevas: [],
  },
  fechaCreacion: new Date(), contenidoModelo: contenidoPersistido,
  nombreModelo: 'Sistema de ventas', descripcionModelo: null,
};

describe('CU13 bloque 8.2 — persistencia atómica de propuestas', () => {
  const llamadas: string[] = [];
  let filaActual: typeof fila | undefined;
  let query: jest.Mock;
  let repo: TypeOrmPropuestasUmlIaRepository;
  beforeEach(() => {
    llamadas.length = 0;
    filaActual = { ...fila };
    query = jest.fn(async (sql: string, parametros?: unknown[]) => {
      llamadas.push(sql);
      if (sql.includes('FOR UPDATE OF m, p')) return filaActual ? [filaActual] : [];
      if (sql.includes('UPDATE modelo_uml')) {
        expect(parametros?.[3]).toBe(14);
        return [{ id: m, version: 15 }];
      }
      if (sql.includes('UPDATE propuesta_uml_ia')) return [{ id: propuestaId }];
      throw new Error('SQL inesperado');
    });
    const db = { transaction: jest.fn(async (fn: (manager: { query: jest.Mock }) => Promise<unknown>) => fn({ query })) };
    repo = new TypeOrmPropuestasUmlIaRepository(db as unknown as DataSource);
  });
  it('bloquea modelo y propuesta, guarda contenido + Yjs y pasa a APLICADA en la misma transacción', async () => {
    const r = await repo.aplicar(u, p, m, c, propuestaId);
    expect(r?.propuesta.estado).toBe('APLICADA');
    expect(r?.modelo.version).toBe(15);
    expect(r?.modelo.contenido.clases.map((x) => x.nombre)).toEqual(['Venta', 'Categoria']);
    expect(r?.estadoYjsBase64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(llamadas[0]).toContain('FOR UPDATE OF m, p');
    expect(llamadas[1]).toContain('UPDATE modelo_uml');
    expect(llamadas[2]).toContain("estado = 'APLICADA'");
    expect(JSON.parse(query.mock.calls[1][1][2]).configuracion.__colaboracion.estadoYjsBase64).toBe(r?.estadoYjsBase64);
  });
  it('devuelve conflicto sin escribir si la propuesta fue rechazada o ya aplicada', async () => {
    filaActual = { ...fila, estado: 'RECHAZADA' };
    await expect(repo.aplicar(u, p, m, c, propuestaId)).rejects.toBeInstanceOf(AplicacionPropuestaConflictivaError);
    expect(llamadas).toHaveLength(1);
  });
  it('rechaza la aplicación sin snapshot colaborativo seguro', async () => {
    filaActual = { ...fila, contenidoModelo: contenido };
    await expect(repo.aplicar(u, p, m, c, propuestaId)).rejects.toBeInstanceOf(AplicacionPropuestaConflictivaError);
    expect(llamadas).toHaveLength(1);
  });
  it('devuelve conflicto sin escribir cuando cambió la versión del modelo', async () => {
    filaActual = { ...fila, versionActual: 15 };
    await expect(repo.aplicar(u, p, m, c, propuestaId)).rejects.toBeInstanceOf(AplicacionPropuestaConflictivaError);
    expect(llamadas).toHaveLength(1);
  });
  it('no encuentra una propuesta cruzada de proyecto, modelo o conversación', async () => {
    filaActual = undefined;
    expect(await repo.aplicar(u, p, m, c, propuestaId)).toBeNull();
    expect(llamadas).toHaveLength(1);
    expect(query.mock.calls[0][1]).toEqual([p, m, c, u, propuestaId]);
  });
});
