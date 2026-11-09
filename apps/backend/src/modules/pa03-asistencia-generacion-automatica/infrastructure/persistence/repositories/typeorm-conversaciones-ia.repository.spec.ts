import type { DataSource, EntityManager } from 'typeorm';
import { TypeOrmConversacionesIaRepository } from './typeorm-conversaciones-ia.repository';

const proyecto = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const usuario = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const conversacion = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const conversacionFila = {
  id: conversacion,
  idProyecto: proyecto,
  titulo: 'Diseño',
};
const mensajeFila = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  tipoEmisor: 'USUARIO',
  idConversacion: conversacion,
  idUsuario: usuario,
};

describe('TypeOrmConversacionesIaRepository: consultas aisladas por proyecto', () => {
  let query: jest.Mock;
  let txQuery: jest.Mock;
  let transaction: jest.Mock;
  let repo: TypeOrmConversacionesIaRepository;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue([]);
    txQuery = jest.fn().mockResolvedValue([]);
    transaction = jest
      .fn()
      .mockImplementation(
        async (fn: (manager: EntityManager) => Promise<unknown>) =>
          fn({ query: txQuery } as unknown as EntityManager),
      );
    repo = new TypeOrmConversacionesIaRepository({
      query,
      transaction,
    } as unknown as DataSource);
  });

  it('crea con proyecto activo y membresía activa, sin aceptar otro proyecto en el cuerpo', async () => {
    query.mockResolvedValue([conversacionFila]);
    await expect(repo.crear(proyecto, usuario, 'Diseño')).resolves.toEqual(
      conversacionFila,
    );
    const [sql, parametros] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO conversacion_ia');
    expect(sql).toContain("m.estado = 'ACTIVA'");
    expect(sql).toContain("p.estado = 'ACTIVO'");
    expect(parametros).toEqual([proyecto, usuario, 'Diseño']);
  });

  it('lista sólo las conversaciones de proyecto y usuario autorizado', async () => {
    await repo.listar(proyecto, usuario, 30, 10);
    const [sql, parametros] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('c.id_proyecto = $1');
    expect(sql).toContain('mb.id_usuario = $2');
    expect(parametros).toEqual([proyecto, usuario, 30, 10]);
  });

  it('obtiene una conversación sólo si coinciden proyecto, id y miembro activo', async () => {
    await expect(
      repo.obtener(proyecto, usuario, conversacion),
    ).resolves.toBeNull();
    const [sql, parametros] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('c.id = $3 AND c.id_proyecto = $1');
    expect(sql).toContain("mb.estado = 'ACTIVA'");
    expect(parametros).toEqual([proyecto, usuario, conversacion]);
  });

  it('archivar exige conversación activa y proyecto válido', async () => {
    await repo.archivar(proyecto, usuario, conversacion);
    const [sql] = query.mock.calls[0] as [string];
    expect(sql).toContain("c.estado = 'ACTIVA'");
    expect(sql).toContain('c.id_proyecto = $1');
    expect(sql).toContain('mb.id_usuario = $2');
  });

  it('archivar devuelve la fila de UPDATE RETURNING y no una tupla técnica', async () => {
    const archivada = { ...conversacionFila, estado: 'ARCHIVADA', fechaActualizacion: '2026-11-07T16:00:00Z' };
    query.mockResolvedValueOnce([[archivada], 1]);
    await expect(repo.archivar(proyecto, usuario, conversacion)).resolves.toEqual(archivada);
  });

  it('envía mensajes con identidad humana y actualiza la conversación en una transacción', async () => {
    txQuery.mockResolvedValueOnce([mensajeFila]).mockResolvedValueOnce([]);
    await expect(
      repo.enviarMensajeUsuario(
        proyecto,
        conversacion,
        usuario,
        'Hola',
        'solicitud',
      ),
    ).resolves.toEqual(mensajeFila);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txQuery).toHaveBeenCalledTimes(2);
    const [insert, params] = txQuery.mock.calls[0] as [string, unknown[]];
    expect(insert).toContain("SELECT $4, 'USUARIO', $5, c.id, $3");
    expect(insert).toContain('c.id_proyecto = $1');
    expect(insert).toContain("m.estado = 'ACTIVA'");
    expect(params).toEqual([
      proyecto,
      conversacion,
      usuario,
      'Hola',
      'solicitud',
    ]);
    expect((txQuery.mock.calls[1] as [string])[0]).toContain(
      'UPDATE conversacion_ia',
    );
  });

  it('no actualiza la fecha cuando no existe el chat o se retiró la membresía', async () => {
    await expect(
      repo.enviarMensajeUsuario(
        proyecto,
        conversacion,
        usuario,
        'Hola',
        'solicitud',
      ),
    ).resolves.toBeNull();
    expect(txQuery).toHaveBeenCalledTimes(1);
  });

  it('un error de persistencia se propaga para rollback de la transacción TypeORM', async () => {
    txQuery
      .mockResolvedValueOnce([mensajeFila])
      .mockRejectedValueOnce(new Error('fallo simulado'));
    await expect(
      repo.enviarMensajeUsuario(
        proyecto,
        conversacion,
        usuario,
        'Hola',
        'solicitud',
      ),
    ).rejects.toThrow('fallo simulado');
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('nunca consulta mensajes usando solamente id de conversación', async () => {
    query
      .mockResolvedValueOnce([conversacionFila])
      .mockResolvedValueOnce([mensajeFila]);
    await expect(
      repo.listarMensajes(proyecto, usuario, conversacion, 20, 0),
    ).resolves.toEqual([mensajeFila]);
    expect(query).toHaveBeenCalledTimes(2);
    const [sql, parametros] = query.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain('c.id_proyecto = $1');
    expect(sql).toContain('mb.id_usuario = $2');
    expect(parametros).toEqual([proyecto, usuario, conversacion, 20, 0]);
  });

  it('registra respuesta de IA solamente para solicitud humana del proyecto y usuario, sin duplicarla', async () => {
    const filaRespuesta = {
      ...mensajeFila, tipoEmisor: 'IA', idUsuario: null,
      identificadorSolicitud: 'solicitud-1',
    };
    txQuery.mockResolvedValueOnce([{ id: conversacion }])
      .mockResolvedValueOnce([filaRespuesta])
      .mockResolvedValueOnce([]);
    await expect(repo.registrarRespuestaIa(
      proyecto, conversacion, usuario, 'solicitud-1', 'Respuesta',
    )).resolves.toEqual(filaRespuesta);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txQuery).toHaveBeenCalledTimes(3);
    const [bloqueo, argumentos] = txQuery.mock.calls[0] as [string, unknown[]];
    expect(bloqueo).toContain('FOR UPDATE OF c');
    expect(bloqueo).toContain("c.estado = 'ACTIVA'");
    expect(bloqueo).toContain("mb.estado = 'ACTIVA'");
    expect(argumentos).toEqual([proyecto, conversacion, usuario]);
    const [insercion, parametros] = txQuery.mock.calls[1] as [string, unknown[]];
    expect(insercion).toContain("SELECT $5, 'IA', $4, c.id, NULL");
    expect(insercion).toContain('humano.id_usuario = $3');
    expect(insercion).toContain("humano.tipo_emisor = 'USUARIO'");
    expect(insercion).toContain('humano.identificador_solicitud = $4');
    expect(insercion).toContain('AND NOT EXISTS');
    expect(parametros).toEqual([proyecto, conversacion, usuario, 'solicitud-1', 'Respuesta']);
  });

  it('no crea respuestas de IA si el proyecto fue archivado o la membresía fue retirada', async () => {
    txQuery.mockResolvedValueOnce([]);
    await expect(repo.registrarRespuestaIa(
      proyecto, conversacion, usuario, 'solicitud-2', 'Respuesta',
    )).resolves.toBeNull();
    expect(txQuery).toHaveBeenCalledTimes(1);
  });

  it('no actualiza conversación si no existe solicitud humana o ya existe una respuesta', async () => {
    txQuery.mockResolvedValueOnce([{ id: conversacion }]).mockResolvedValueOnce([]);
    await expect(repo.registrarRespuestaIa(
      proyecto, conversacion, usuario, 'solicitud-inexistente', 'Respuesta',
    )).resolves.toBeNull();
    expect(txQuery).toHaveBeenCalledTimes(2);
  });

});
