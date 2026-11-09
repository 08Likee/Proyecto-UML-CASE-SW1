import type { DataSource, EntityManager } from 'typeorm';
import { TypeOrmPurgaConversacionesRepository } from './typeorm-purga-conversaciones.repository';

const chat1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const chat2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('CU-12 bloque 12.2.2: purga irreversible transaccional', () => {
  let consultar: jest.Mock;
  let transaccion: jest.Mock;
  let repositorio: TypeOrmPurgaConversacionesRepository;

  beforeEach(() => {
    consultar = jest.fn().mockResolvedValue([]);
    transaccion = jest.fn().mockImplementation(
      async (ejecutar: (manager: EntityManager) => Promise<number>) =>
        ejecutar({ query: consultar } as unknown as EntityManager),
    );
    repositorio = new TypeOrmPurgaConversacionesRepository({
      transaction: transaccion,
    } as unknown as DataSource);
  });

  it('sin chats vencidos no emite ningún DELETE', async () => {
    await expect(repositorio.purgarLote(25)).resolves.toBe(0);
    expect(consultar).toHaveBeenCalledTimes(1);
    const [sql, parametros] = consultar.mock.calls[0] as [string, number[]];
    expect(sql).toContain("c.estado = 'ELIMINADA'");
    expect(sql).toContain('c.fecha_purga <= CURRENT_TIMESTAMP');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('ORDER BY c.fecha_purga ASC');
    expect(parametros).toEqual([25]);
  });

  it('filtra exclusivamente vencidas según reloj SQL, sin fecha aportada por usuario', async () => {
    // La selección representa una ejecución a 7/12: solo el chat1 expiró.
    consultar.mockResolvedValueOnce([{ id: chat1 }])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([[{ id: chat1 }], 1]);
    await expect(repositorio.purgarLote(25)).resolves.toBe(1);
    const [sentencia, parametros] = consultar.mock.calls[3] as [string, string[][]];
    expect(sentencia).toContain("estado = 'ELIMINADA'");
    expect(sentencia).toContain('fecha_purga <= CURRENT_TIMESTAMP');
    expect(parametros).toEqual([[chat1]]);
    expect(JSON.stringify(consultar.mock.calls)).not.toContain(chat2);
  });

  it('borra propuestas, mensajes y chat en ese orden y en una sola transacción', async () => {
    consultar.mockResolvedValueOnce([{ id: chat1 }, { id: chat2 }])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([[{ id: chat1 }, { id: chat2 }], 2]);
    await expect(repositorio.purgarLote(25)).resolves.toBe(2);
    expect(transaccion).toHaveBeenCalledTimes(1);
    expect(consultar).toHaveBeenCalledTimes(4);
    expect((consultar.mock.calls[1] as [string])[0]).toContain('DELETE FROM propuesta_uml_ia');
    expect((consultar.mock.calls[2] as [string])[0]).toContain('DELETE FROM mensaje_ia');
    expect((consultar.mock.calls[3] as [string])[0]).toContain('DELETE FROM conversacion_ia');
    for (const llamada of consultar.mock.calls.slice(1)) {
      expect(llamada[1]).toEqual([[chat1, chat2]]);
    }
  });

  it('falla la operación completa si hay dependencias nuevas sin manejar', async () => {
    consultar.mockResolvedValueOnce([{ id: chat1 }])
      .mockRejectedValueOnce(new Error('restricción FK'));
    await expect(repositorio.purgarLote(25)).rejects.toThrow('restricción FK');
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(transaccion).toHaveBeenCalledTimes(1);
    // TypeORM revierte el lote cuando la callback de transaction rechaza.
  });

  it('si el DELETE final no coincide con la selección, falla y provoca rollback', async () => {
    consultar.mockResolvedValueOnce([{ id: chat1 }])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([[], 0])
      .mockResolvedValueOnce([[], 0]);
    await expect(repositorio.purgarLote(25)).rejects.toThrow('no confirmó');
  });

  it('no acepta tamaños de lote fuera de 1..50 y no inicia transacción', async () => {
    for (const limite of [0, -1, 51, 1.3, Number.NaN]) {
      await expect(repositorio.purgarLote(limite)).rejects.toThrow('inválido');
    }
    expect(transaccion).not.toHaveBeenCalled();
  });
});
