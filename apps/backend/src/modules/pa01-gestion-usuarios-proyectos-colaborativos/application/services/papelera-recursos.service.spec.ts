import type { DataSource, EntityManager } from 'typeorm';
import type { AutorizacionProyectoService } from './autorizacion-proyecto.service';
import type { ProyectoRepository } from '../../domain/repositories/proyecto.repository';
import { PapeleraRecursosService, restauracionDisponible } from './papelera-recursos.service';

describe('Papeleras de modelos y proyectos — 30 días', () => {
  const usuario = 'usuario-anfitrion';
  const proyectoId = 'proyecto-prueba';
  const modeloId = 'modelo-descartable';
  let query: jest.Mock;
  let managerQuery: jest.Mock;
  let transaccion: jest.Mock;
  let tienePermiso: jest.Mock;
  let esAnfitrionActivo: jest.Mock;
  let servicio: PapeleraRecursosService;
  let proyecto: { id: string; estado: string; estadoAnterior: string; fechaPurga: Date | null; nombre: string };
  let modelo: { id: string; estado: string; estadoAnterior: string; fechaPurga: Date | null; nombre: string };

  beforeEach(() => {
    proyecto = { id: proyectoId, estado: 'ACTIVO', estadoAnterior: 'ACTIVO', fechaPurga: null, nombre: 'Descartable' };
    modelo = { id: modeloId, estado: 'ACTIVO', estadoAnterior: 'ACTIVO', fechaPurga: null, nombre: 'Clases de prueba' };
    query = jest.fn().mockResolvedValue([]);
    managerQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM proyecto WHERE id')) return Promise.resolve([proyecto]);
      if (sql.includes('FROM modelo_uml WHERE id')) return Promise.resolve([modelo]);
      return Promise.resolve([]);
    });
    transaccion = jest.fn((fn: (m: EntityManager) => Promise<unknown>) => fn({ query: managerQuery } as unknown as EntityManager));
    tienePermiso = jest.fn().mockResolvedValue(true);
    esAnfitrionActivo = jest.fn().mockResolvedValue(true);
    servicio = new PapeleraRecursosService(
      { query, transaction: transaccion } as unknown as DataSource,
      { tienePermiso } as unknown as AutorizacionProyectoService,
      { esAnfitrionActivo } as unknown as ProyectoRepository,
    );
  });

  it('solo el estado ELIMINADO es restaurable antes de vencer', () => {
    const futuro = new Date(Date.now() + 90_000);
    expect(restauracionDisponible('ELIMINADO', futuro, new Date())).toBe(true);
    expect(restauracionDisponible('ACTIVO', futuro, new Date())).toBe(false);
    expect(restauracionDisponible('ARCHIVADO', futuro, new Date())).toBe(false);
    expect(restauracionDisponible('ELIMINADO', null, new Date())).toBe(false);
  });

  it('el día de vencimiento inclusive ya no se puede restaurar', () => {
    const ahora = new Date();
    expect(restauracionDisponible('ELIMINADO', ahora, ahora)).toBe(false);
    expect(restauracionDisponible('ELIMINADO', new Date(ahora.getTime() - 1), ahora)).toBe(false);
  });

  it('no permite mover proyectos si no es Anfitrión', async () => {
    esAnfitrionActivo.mockResolvedValue(false);
    await expect(servicio.moverProyecto(usuario, proyectoId)).rejects.toThrow('Anfitrión');
    expect(transaccion).not.toHaveBeenCalled();
  });

  it('DENEGAR prevalece incluso sobre el Anfitrión', async () => {
    tienePermiso.mockResolvedValue(false);
    await expect(servicio.moverProyecto(usuario, proyectoId)).rejects.toThrow('Anfitrión');
    expect(transaccion).not.toHaveBeenCalled();
  });

  it('mover un proyecto no borra directamente sus hijos', async () => {
    await servicio.moverProyecto(usuario, proyectoId);
    const actualizacion = managerQuery.mock.calls.find(([sql]: [string]) => sql.includes('UPDATE proyecto'))?.[0] as string;
    expect(actualizacion).toContain("estado = 'ELIMINADO'");
    expect(actualizacion).toContain("INTERVAL '30 days'");
    expect(managerQuery.mock.calls.every(([sql]: [string]) => !sql.includes('DELETE FROM'))).toBe(true);
    expect(transaccion).toHaveBeenCalledTimes(1);
  });

  it('no permite eliminar dos veces un mismo proyecto', async () => {
    proyecto.estado = 'ELIMINADO';
    await expect(servicio.moverProyecto(usuario, proyectoId)).rejects.toThrow();
    expect(managerQuery.mock.calls.some(([sql]: [string]) => sql.includes('UPDATE proyecto'))).toBe(false);
  });

  it('restauración de proyecto comprueba la autorización específica sobre la papelera', async () => {
    proyecto.estado = 'ELIMINADO';
    proyecto.fechaPurga = new Date(Date.now() + 120_000);
    await servicio.restaurarProyecto(usuario, proyectoId);
    expect(tienePermiso).toHaveBeenCalledWith(usuario, proyectoId, 'PROYECTO', 'MODIFICAR', true);
    expect(managerQuery.mock.calls.some(([sql]: [string]) => sql.includes('COALESCE(estado_anterior'))).toBe(true);
    expect(managerQuery.mock.calls.some(([sql]: [string]) => sql.includes('DELETE FROM'))).toBe(false);
  });

  it('no restaura proyectos vencidos', async () => {
    proyecto.estado = 'ELIMINADO';
    proyecto.fechaPurga = new Date(Date.now() - 10_000);
    await expect(servicio.restaurarProyecto(usuario, proyectoId)).rejects.toThrow('restauración');
  });

  it('lista proyectos eliminados solo tras verificar permisos individuales', async () => {
    query.mockResolvedValue([{ id: 'uno', nombre: 'Uno' }, { id: 'dos', nombre: 'Dos' }]);
    tienePermiso.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await servicio.listarProyectos(usuario)).toEqual([{ id: 'uno', nombre: 'Uno' }]);
    expect(tienePermiso).toHaveBeenCalledWith(usuario, 'dos', 'PROYECTO', 'MODIFICAR', true);
  });

  it('la papelera de modelos solo es consultable por Anfitrión autorizado', async () => {
    esAnfitrionActivo.mockResolvedValue(false);
    await expect(servicio.listarModelos(usuario, proyectoId)).rejects.toThrow('Anfitrión');
    expect(query).not.toHaveBeenCalled();
  });

  it('modelo borrado exige proyecto activo y no altera otras clases', async () => {
    await servicio.moverModelo(usuario, proyectoId, modeloId);
    expect(managerQuery.mock.calls[0]?.[0]).toContain('FROM proyecto');
    expect(managerQuery.mock.calls[1]?.[0]).toContain('FROM modelo_uml');
    expect(managerQuery.mock.calls[2]?.[0]).toContain("estado = 'ELIMINADO'");
    expect(managerQuery.mock.calls[2]?.[0]).not.toContain('DELETE');
  });

  it('proyecto en papelera bloquea operaciones sobre modelos dependientes', async () => {
    proyecto.estado = 'ELIMINADO';
    await expect(servicio.moverModelo(usuario, proyectoId, modeloId)).rejects.toThrow('Proyecto no disponible');
    expect(managerQuery.mock.calls.some(([sql]: [string]) => sql.includes('UPDATE modelo_uml'))).toBe(false);
  });

  it('solo permite mover modelos activos', async () => {
    modelo.estado = 'ARCHIVADO';
    await expect(servicio.moverModelo(usuario, proyectoId, modeloId)).rejects.toThrow('Modelo UML no disponible');
  });

  it('restaurar modelo preserva versión y contenido persistidos', async () => {
    modelo.estado = 'ELIMINADO';
    modelo.fechaPurga = new Date(Date.now() + 60_000);
    await servicio.restaurarModelo(usuario, proyectoId, modeloId);
    const sql = managerQuery.mock.calls[2]?.[0] as string;
    expect(sql).toContain('COALESCE(estado_anterior');
    expect(sql).not.toMatch(/contenido|version\s*=/);
  });

  it('una fecha de purga vencida bloquea restauración de modelos', async () => {
    modelo.estado = 'ELIMINADO';
    modelo.fechaPurga = new Date(Date.now() - 100);
    await expect(servicio.restaurarModelo(usuario, proyectoId, modeloId)).rejects.toThrow('restauración');
  });

  it('una falla de actualización aborta la transacción de papelera', async () => {
    managerQuery.mockRejectedValueOnce(new Error('postgres caído'));
    await expect(servicio.moverProyecto(usuario, proyectoId)).rejects.toThrow('postgres caído');
    expect(transaccion).toHaveBeenCalledTimes(1);
  });
  it('el Editor tampoco puede restaurar proyectos aunque existan en papelera', async () => {
    proyecto.estado = 'ELIMINADO';
    proyecto.fechaPurga = new Date(Date.now() + 60_000);
    esAnfitrionActivo.mockResolvedValue(false);
    await expect(servicio.restaurarProyecto(usuario, proyectoId)).rejects.toThrow('Anfitrión');
    expect(transaccion).not.toHaveBeenCalled();
  });

  it('DENEGAR bloquea la restauración aun siendo Anfitrión', async () => {
    proyecto.estado = 'ELIMINADO';
    proyecto.fechaPurga = new Date(Date.now() + 60_000);
    tienePermiso.mockResolvedValue(false);
    await expect(servicio.restaurarProyecto(usuario, proyectoId)).rejects.toThrow('Anfitrión');
    expect(transaccion).not.toHaveBeenCalled();
  });

  it('la restauración de un modelo falla si el proyecto sigue en papelera', async () => {
    proyecto.estado = 'ELIMINADO';
    modelo.estado = 'ELIMINADO';
    modelo.fechaPurga = new Date(Date.now() + 60_000);
    await expect(servicio.restaurarModelo(usuario, proyectoId, modeloId))
      .rejects.toThrow('Proyecto no disponible');
    expect(managerQuery.mock.calls.some(([sql]: [string]) => sql.includes('UPDATE modelo_uml'))).toBe(false);
  });

  it('restaurar el proyecto no modifica hijos ni crea nuevas versiones UML', async () => {
    proyecto.estado = 'ELIMINADO';
    proyecto.fechaPurga = new Date(Date.now() + 60_000);
    await servicio.restaurarProyecto(usuario, proyectoId);
    expect(managerQuery.mock.calls.some(([sql]: [string]) => /(?:UPDATE|DELETE|INSERT INTO)\s+(?:modelo_uml|mensaje_ia|conversacion_ia|membresia)/i.test(sql))).toBe(false);
    expect(managerQuery.mock.calls.some(([sql]: [string]) => /version\s*=/.test(sql))).toBe(false);
  });

});
