import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import { ConversacionesIaRepository } from '../ports/conversaciones-ia.repository';
import { Cu12ConversacionesIaService } from './cu12-conversaciones-ia.service';
import type {
  ConversacionIa,
  MensajeIa,
} from '../../domain/models/conversacion-ia';

const proyecto = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const usuario = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const conversacion = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const conversacionBase: ConversacionIa = {
  id: conversacion,
  titulo: 'Diseño del dominio',
  fechaCreacion: new Date('2026-11-05'),
  fechaActualizacion: new Date('2026-11-05'),
  estado: 'ACTIVA',
  idProyecto: proyecto,
  idCreador: usuario,
};
const mensajeBase: MensajeIa = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  contenido: '¿Qué es UML?',
  tipoEmisor: 'USUARIO',
  fechaCreacion: new Date('2026-11-05'),
  identificadorSolicitud: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  idConversacion: conversacion,
  idUsuario: usuario,
};

describe('Cu12ConversacionesIaService: autorización y separación entre proyectos', () => {
  let service: Cu12ConversacionesIaService;
  let permiso: jest.Mock;
  let repo: {
    crear: jest.Mock;
    listar: jest.Mock;
    obtener: jest.Mock;
    archivar: jest.Mock;
    enviarMensajeUsuario: jest.Mock;
    registrarRespuestaIa: jest.Mock;
    listarMensajes: jest.Mock;
  };

  beforeEach(() => {
    permiso = jest.fn().mockResolvedValue(undefined);
    repo = {
      crear: jest.fn().mockResolvedValue(conversacionBase),
      listar: jest.fn().mockResolvedValue([conversacionBase]),
      obtener: jest.fn().mockResolvedValue(conversacionBase),
      archivar: jest
        .fn()
        .mockResolvedValue({ ...conversacionBase, estado: 'ARCHIVADA' }),
      enviarMensajeUsuario: jest.fn().mockResolvedValue(mensajeBase),
      registrarRespuestaIa: jest.fn().mockResolvedValue({ ...mensajeBase, tipoEmisor: 'IA', idUsuario: null }),
      listarMensajes: jest.fn().mockResolvedValue([mensajeBase]),
    };
    service = new Cu12ConversacionesIaService(
      { exigirPermiso: permiso } as unknown as AutorizacionProyectoService,
      repo as unknown as ConversacionesIaRepository,
    );
  });

  it('crea un chat compartido y registra el usuario creador (sin chats privados)', async () => {
    await expect(
      service.crear(usuario, proyecto, '  Diseño del dominio  '),
    ).resolves.toEqual(conversacionBase);
    expect(permiso).toHaveBeenCalledWith(
      usuario,
      proyecto,
      'PROYECTO',
      'CONSULTAR',
    );
    expect(repo.crear).toHaveBeenCalledWith(
      proyecto,
      usuario,
      'Diseño del dominio',
    );
  });

  it('no accede al repositorio si la autorización efectiva deniega el acceso', async () => {
    permiso.mockRejectedValue(new OperacionProyectoNoAutorizadaError());
    await expect(service.listar(usuario, proyecto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.listar).not.toHaveBeenCalled();
  });

  it('usa siempre el proyecto para recuperar una conversación, incluso con id conocido', async () => {
    await service.obtener(usuario, proyecto, conversacion);
    expect(repo.obtener).toHaveBeenCalledWith(proyecto, usuario, conversacion);
  });

  it('oculta con 404 una conversación que no pertenece al proyecto', async () => {
    repo.obtener.mockResolvedValue(null);
    await expect(
      service.obtener(usuario, proyecto, conversacion),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recupera historiales con proyecto, conversación y paginación acotados', async () => {
    await expect(
      service.listarMensajes(usuario, proyecto, conversacion, 20, 40),
    ).resolves.toEqual([mensajeBase]);
    expect(repo.listarMensajes).toHaveBeenCalledWith(
      proyecto,
      usuario,
      conversacion,
      20,
      40,
    );
  });

  it('no expone mensajes cuando la conversación corresponde a otro proyecto', async () => {
    repo.listarMensajes.mockResolvedValue(null);
    await expect(
      service.listarMensajes(usuario, proyecto, conversacion),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza paginación desmesurada antes de consultar datos', async () => {
    await expect(
      service.listar(usuario, proyecto, 1000),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.listarMensajes(usuario, proyecto, conversacion, 10, -1),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.listar).not.toHaveBeenCalled();
    expect(repo.listarMensajes).not.toHaveBeenCalled();
  });

  it('archivar requiere modificar el proyecto; consultar no basta', async () => {
    await service.archivar(usuario, proyecto, conversacion);
    expect(permiso).toHaveBeenCalledWith(
      usuario,
      proyecto,
      'PROYECTO',
      'MODIFICAR',
    );
    expect(repo.archivar).toHaveBeenCalledWith(proyecto, usuario, conversacion);
  });

  it('rechaza archivar una conversación inexistente o de otro proyecto', async () => {
    repo.archivar.mockResolvedValue(null);
    await expect(
      service.archivar(usuario, proyecto, conversacion),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registrar mensajes siempre identifica al emisor humano y genera identificador único', async () => {
    await service.enviarMensaje(
      usuario,
      proyecto,
      conversacion,
      '  ¿Qué es UML?  ',
    );
    await service.enviarMensaje(
      usuario,
      proyecto,
      conversacion,
      'Otra pregunta',
    );
    expect(repo.enviarMensajeUsuario).toHaveBeenCalledWith(
      proyecto,
      conversacion,
      usuario,
      '¿Qué es UML?',
      expect.any(String),
    );
    const primera = repo.enviarMensajeUsuario.mock.calls[0][4] as string;
    const segunda = repo.enviarMensajeUsuario.mock.calls[1][4] as string;
    expect(primera).toMatch(/^[a-f\d-]{36}$/);
    expect(primera).not.toBe(segunda);
  });

  it('rechaza el texto vacío y los mensajes excesivos sin registrar mensajes', async () => {
    await expect(
      service.enviarMensaje(usuario, proyecto, conversacion, '  '),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.enviarMensaje(usuario, proyecto, conversacion, 'x'.repeat(8001)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.enviarMensajeUsuario).not.toHaveBeenCalled();
  });

  it('no permite escribir sobre una conversación archivada o externa', async () => {
    repo.enviarMensajeUsuario.mockResolvedValue(null);
    await expect(
      service.enviarMensaje(usuario, proyecto, conversacion, 'hola'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lista conversaciones paginadas del proyecto y no de otro', async () => {
    await service.listar(usuario, proyecto, 30, 10);
    expect(repo.listar).toHaveBeenCalledWith(proyecto, usuario, 30, 10);
  });

  it('exige título no vacío y tamaño acotado', async () => {
    await expect(service.crear(usuario, proyecto, '  ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.crear(usuario, proyecto, 'x'.repeat(201)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('al guardar IA revalida el permiso del solicitante y mantiene UUID de correlación', async () => {
    await service.guardarRespuestaIa(usuario, proyecto, conversacion, mensajeBase.identificadorSolicitud, 'Respuesta');
    expect(permiso).toHaveBeenCalledWith(usuario, proyecto, 'PROYECTO', 'CONSULTAR');
    expect(repo.registrarRespuestaIa).toHaveBeenCalledWith(
      proyecto, conversacion, usuario, mensajeBase.identificadorSolicitud, 'Respuesta',
    );
  });

  it('si el permiso fue revocado durante la generación, no registra ninguna respuesta IA', async () => {
    permiso.mockRejectedValue(new OperacionProyectoNoAutorizadaError());
    await expect(
      service.guardarRespuestaIa(usuario, proyecto, conversacion, mensajeBase.identificadorSolicitud, 'Respuesta'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.registrarRespuestaIa).not.toHaveBeenCalled();
  });

});
