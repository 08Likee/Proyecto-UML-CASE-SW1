import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cu12ConversacionesIaService } from './cu12-conversaciones-ia.service';
import { AutorizacionProyectoService } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import { ConversacionesIaRepository } from '../ports/conversaciones-ia.repository';

const proyecto = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const usuario = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const chat = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const original = {
  id: chat, titulo: 'CU13 - Prueba', idProyecto: proyecto, idCreador: usuario,
  estado: 'ACTIVA' as const, fechaCreacion: new Date(0), fechaActualizacion: new Date(0),
};
const eliminada = {
  ...original, estado: 'ELIMINADA' as const, estadoAnterior: 'ACTIVA' as const,
  fechaEliminacion: new Date('2026-11-07T00:00:00Z'), fechaPurga: new Date('2026-12-07T00:00:00Z'),
};

describe('CU12 bloque 12.2.1: papelera exclusiva del Anfitrión', () => {
  let exigirPermiso: jest.Mock;
  let repo: {
    esAnfitrion: jest.Mock; listarPapelera: jest.Mock; moverAPapelera: jest.Mock;
    restaurarPapelera: jest.Mock; obtener: jest.Mock; listarMensajes: jest.Mock;
  };
  let servicio: Cu12ConversacionesIaService;

  beforeEach(() => {
    exigirPermiso = jest.fn().mockResolvedValue(undefined);
    repo = {
      esAnfitrion: jest.fn().mockResolvedValue(true),
      listarPapelera: jest.fn().mockResolvedValue([eliminada]),
      moverAPapelera: jest.fn().mockResolvedValue(eliminada),
      restaurarPapelera: jest.fn().mockResolvedValue(original),
      obtener: jest.fn().mockResolvedValue(null),
      listarMensajes: jest.fn().mockResolvedValue(null),
    };
    servicio = new Cu12ConversacionesIaService(
      { exigirPermiso } as unknown as AutorizacionProyectoService,
      repo as unknown as ConversacionesIaRepository,
    );
  });

  it('consulta la papelera usando permiso efectivo MODIFICAR y rol de Anfitrión', async () => {
    await expect(servicio.listarPapelera(usuario, proyecto, 10, 0)).resolves.toEqual([eliminada]);
    expect(exigirPermiso).toHaveBeenCalledWith(usuario, proyecto, 'PROYECTO', 'MODIFICAR');
    expect(repo.esAnfitrion).toHaveBeenCalledWith(proyecto, usuario);
    expect(repo.listarPapelera).toHaveBeenCalledWith(proyecto, usuario, 10, 0);
  });

  it('un editor con MODIFICAR no obtiene acceso a la papelera', async () => {
    repo.esAnfitrion.mockResolvedValue(false);
    await expect(servicio.listarPapelera(usuario, proyecto)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.moverAPapelera(usuario, proyecto, chat)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.restaurarPapelera(usuario, proyecto, chat)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.listarPapelera).not.toHaveBeenCalled();
    expect(repo.moverAPapelera).not.toHaveBeenCalled();
    expect(repo.restaurarPapelera).not.toHaveBeenCalled();
  });

  it('DENEGAR tiene prioridad incluso sobre el rol Anfitrión', async () => {
    exigirPermiso.mockRejectedValue(new OperacionProyectoNoAutorizadaError());
    await expect(servicio.moverAPapelera(usuario, proyecto, chat)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.esAnfitrion).not.toHaveBeenCalled();
    expect(repo.moverAPapelera).not.toHaveBeenCalled();
  });

  it('traslada una conversación del mismo proyecto a la papelera', async () => {
    await expect(servicio.moverAPapelera(usuario, proyecto, chat)).resolves.toEqual(eliminada);
    expect(repo.moverAPapelera).toHaveBeenCalledWith(proyecto, usuario, chat);
  });

  it('una conversación previamente eliminada o ajena no se vuelve a eliminar', async () => {
    repo.moverAPapelera.mockResolvedValue(null);
    await expect(servicio.moverAPapelera(usuario, proyecto, chat)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('restaurar conserva el estado activo anterior', async () => {
    await expect(servicio.restaurarPapelera(usuario, proyecto, chat)).resolves.toEqual(original);
    expect(repo.restaurarPapelera).toHaveBeenCalledWith(proyecto, usuario, chat);
  });

  it('rechaza restaurar una conversación de otro proyecto o con plazo vencido', async () => {
    repo.restaurarPapelera.mockResolvedValue(null);
    await expect(servicio.restaurarPapelera(usuario, proyecto, chat)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el historial y la consulta normal devuelven 404 para un chat en papelera', async () => {
    await expect(servicio.obtener(usuario, proyecto, chat)).rejects.toBeInstanceOf(NotFoundException);
    await expect(servicio.listarMensajes(usuario, proyecto, chat)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('la paginación de papelera es acotada', async () => {
    await expect(servicio.listarPapelera(usuario, proyecto, 101)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.esAnfitrion).not.toHaveBeenCalled();
  });
});
