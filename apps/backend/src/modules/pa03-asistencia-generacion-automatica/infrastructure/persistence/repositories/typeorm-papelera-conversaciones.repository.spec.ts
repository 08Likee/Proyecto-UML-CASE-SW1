import type { DataSource } from 'typeorm';
import { TypeOrmConversacionesIaRepository } from './typeorm-conversaciones-ia.repository';

const proyecto = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const usuario = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const chat = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('CU12 bloque 12.2.1: consultas SQL de la papelera', () => {
  let consulta: jest.Mock;
  let repo: TypeOrmConversacionesIaRepository;
  beforeEach(() => {
    consulta = jest.fn().mockResolvedValue([]);
    repo = new TypeOrmConversacionesIaRepository({ query: consulta } as unknown as DataSource);
  });
  it('comprueba rol Anfitrión predeterminado y membresía activa', async () => {
    consulta.mockResolvedValue([{ autorizado: true }]);
    await expect(repo.esAnfitrion(proyecto, usuario)).resolves.toBe(true);
    const [sql, args] = consulta.mock.calls[0] as [string, string[]];
    expect(sql).toContain("r.nombre = 'Anfitrión'");
    expect(sql).toContain('r.es_predeterminado = TRUE');
    expect(sql).toContain("mb.estado = 'ACTIVA'");
    expect(args).toEqual([proyecto, usuario]);
  });
  it('la papelera solo muestra chats eliminados no vencidos al Anfitrión', async () => {
    await repo.listarPapelera(proyecto, usuario, 20, 0);
    const [sql, args] = consulta.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("c.estado = 'ELIMINADA'");
    expect(sql).toContain('c.fecha_purga > CURRENT_TIMESTAMP');
    expect(sql).toContain("r.nombre = 'Anfitrión'");
    expect(args).toEqual([proyecto, usuario, 20, 0]);
  });
  it('mover a papelera conserva el estado anterior y asigna exactamente 30 días', async () => {
    await repo.moverAPapelera(proyecto, usuario, chat);
    const [sql, args] = consulta.mock.calls[0] as [string, string[]];
    expect(sql).toContain('estado_anterior = c.estado');
    expect(sql).toContain("estado = 'ELIMINADA'");
    expect(sql).toContain("INTERVAL '30 days'");
    expect(sql).toContain("c.estado IN ('ACTIVA', 'ARCHIVADA')");
    expect(sql).toContain("r.nombre = 'Anfitrión'");
    expect(args).toEqual([proyecto, usuario, chat]);
  });
  it('restauración exige vencimiento futuro y vuelve al estado previo', async () => {
    await repo.restaurarPapelera(proyecto, usuario, chat);
    const [sql, args] = consulta.mock.calls[0] as [string, string[]];
    expect(sql).toContain('estado = c.estado_anterior');
    expect(sql).toContain('fecha_purga = NULL');
    expect(sql).toContain('c.fecha_purga > CURRENT_TIMESTAMP');
    expect(sql).toContain("c.estado_anterior IN ('ACTIVA', 'ARCHIVADA')");
    expect(args).toEqual([proyecto, usuario, chat]);
  });
  it('UPDATE RETURNING: mover devuelve una conversación plana y no la tupla de TypeORM', async () => {
    const eliminada = {
      id: chat, titulo: 'Chat descartable', estado: 'ELIMINADA',
      estadoAnterior: 'ACTIVA', fechaActualizacion: '2026-11-07T16:00:00Z',
    };
    consulta.mockResolvedValueOnce([[eliminada], 1]);
    await expect(repo.moverAPapelera(proyecto, usuario, chat)).resolves.toEqual(eliminada);
  });

  it('UPDATE RETURNING: restaurar devuelve id, estado y fecha válidos para actualización inmediata', async () => {
    const restaurada = {
      id: chat, titulo: 'Chat descartable', estado: 'ACTIVA',
      estadoAnterior: null, fechaActualizacion: '2026-11-07T16:02:00Z',
    };
    consulta.mockResolvedValueOnce([[restaurada], 1]);
    await expect(repo.restaurarPapelera(proyecto, usuario, chat)).resolves.toEqual(restaurada);
  });

  it('UPDATE RETURNING: si no se afectaron filas, mover y restaurar devuelven null', async () => {
    consulta.mockResolvedValueOnce([[], 0]).mockResolvedValueOnce([[], 0]);
    await expect(repo.moverAPapelera(proyecto, usuario, chat)).resolves.toBeNull();
    await expect(repo.restaurarPapelera(proyecto, usuario, chat)).resolves.toBeNull();
  });

  it('listar y obtener habituales jamás exponen chats de papelera', async () => {
    await repo.listar(proyecto, usuario, 30, 0);
    await repo.obtener(proyecto, usuario, chat);
    expect((consulta.mock.calls[0] as [string])[0]).toContain("c.estado <> 'ELIMINADA'");
    expect((consulta.mock.calls[1] as [string])[0]).toContain("c.estado <> 'ELIMINADA'");
  });
  it('mensaje histórico no puede leerse tras eliminar el chat', async () => {
    consulta.mockResolvedValueOnce([{ id: chat }]).mockResolvedValueOnce([]);
    await repo.listarMensajes(proyecto, usuario, chat, 20, 0);
    expect((consulta.mock.calls[1] as [string])[0]).toContain("c.estado <> 'ELIMINADA'");
  });
});
