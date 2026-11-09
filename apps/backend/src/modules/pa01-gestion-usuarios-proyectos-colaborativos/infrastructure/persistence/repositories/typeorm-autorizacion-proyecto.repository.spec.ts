import { TypeOrmAutorizacionProyectoRepository } from './typeorm-autorizacion-proyecto.repository';
import type { DataSource } from 'typeorm';

describe('CU-02: aislamiento de un proyecto enviado a papelera', () => {
  const query = jest.fn().mockResolvedValue([{ permitido: true }]);
  const repo = new TypeOrmAutorizacionProyectoRepository({ query } as unknown as DataSource);

  beforeEach(() => query.mockClear());

  it('las operaciones ordinarias exigen que el proyecto no esté eliminado', async () => {
    expect(await repo.tienePermiso('u', 'p', 'MODELO', 'CONSULTAR')).toBe(true);
    expect(query.mock.calls[0][0]).toContain("pr.estado <> 'ELIMINADO'");
    expect(query.mock.calls[0][1]).toEqual(['u', 'p', 'MODELO', 'CONSULTAR']);
  });

  it('el bypass solo se concede explícitamente a la restauración', async () => {
    expect(await repo.tienePermiso('u', 'p', 'PROYECTO', 'MODIFICAR', true)).toBe(true);
    expect(query.mock.calls[0][0]).not.toContain("AND pr.estado <> 'ELIMINADO'");
  });
});
