import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ConversacionIa,
  MensajeIa,
} from '../../../domain/models/conversacion-ia';
import { ConversacionesIaRepository } from '../../../application/ports/conversaciones-ia.repository';

// Consultas parametrizadas y siempre acotadas por idProyecto para impedir cruces entre proyectos.
@Injectable()
export class TypeOrmConversacionesIaRepository extends ConversacionesIaRepository {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  /** La identidad de Anfitrión no se deduce de una asignación de MODIFICAR. */
  async esAnfitrion(idProyecto: string, idUsuario: string): Promise<boolean> {
    const filas = await this.dataSource.query<Array<{ autorizado: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 FROM proyecto p
        JOIN membresia mb ON mb.id_proyecto = p.id
        JOIN rol r ON r.id = mb.id_rol AND r.id_proyecto = p.id
        WHERE p.id = $1 AND p.estado = 'ACTIVO'
          AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA'
          AND r.nombre = 'Anfitrión' AND r.es_predeterminado = TRUE AND r.estado = 'ACTIVO'
      ) AS autorizado
    `, [idProyecto, idUsuario]);
    return filas[0]?.autorizado === true;
  }

  async listarPapelera(idProyecto: string, idUsuario: string, limite: number, desplazamiento: number): Promise<ConversacionIa[]> {
    return this.dataSource.query<ConversacionIa[]>(`
      SELECT c.id, c.titulo, c.fecha_creacion AS "fechaCreacion",
        c.fecha_actualizacion AS "fechaActualizacion", c.estado,
        c.estado_anterior AS "estadoAnterior",
        c.fecha_eliminacion AS "fechaEliminacion", c.fecha_purga AS "fechaPurga",
        c.id_eliminador AS "idEliminador",
        c.id_proyecto AS "idProyecto", c.id_creador AS "idCreador"
      FROM conversacion_ia c JOIN proyecto p ON p.id = c.id_proyecto
      WHERE c.id_proyecto = $1 AND p.estado = 'ACTIVO'
        AND c.estado = 'ELIMINADA' AND c.fecha_purga > CURRENT_TIMESTAMP
        AND EXISTS (
          SELECT 1 FROM membresia mb JOIN rol r ON r.id = mb.id_rol
          WHERE mb.id_proyecto = p.id AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA'
            AND r.id_proyecto = p.id AND r.nombre = 'Anfitrión'
            AND r.es_predeterminado = TRUE AND r.estado = 'ACTIVO'
        )
      ORDER BY c.fecha_eliminacion DESC, c.id DESC LIMIT $3 OFFSET $4
    `, [idProyecto, idUsuario, limite, desplazamiento]);
  }

  async moverAPapelera(idProyecto: string, idUsuario: string, idConversacion: string): Promise<ConversacionIa | null> {
    const resultado = await this.dataSource.query<[ConversacionIa[], number]>(`
      UPDATE conversacion_ia c SET estado_anterior = c.estado,
        estado = 'ELIMINADA', fecha_eliminacion = CURRENT_TIMESTAMP,
        fecha_purga = CURRENT_TIMESTAMP + INTERVAL '30 days',
        id_eliminador = $2, fecha_actualizacion = CURRENT_TIMESTAMP
      FROM proyecto p WHERE c.id = $3 AND c.id_proyecto = $1
        AND p.id = c.id_proyecto AND p.estado = 'ACTIVO'
        AND c.estado IN ('ACTIVA', 'ARCHIVADA')
        AND EXISTS (
          SELECT 1 FROM membresia mb JOIN rol r ON r.id = mb.id_rol
          WHERE mb.id_proyecto = p.id AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA'
            AND r.id_proyecto = p.id AND r.nombre = 'Anfitrión'
            AND r.es_predeterminado = TRUE AND r.estado = 'ACTIVO'
        )
      RETURNING c.id, c.titulo, c.fecha_creacion AS "fechaCreacion",
        c.fecha_actualizacion AS "fechaActualizacion", c.estado,
        c.estado_anterior AS "estadoAnterior", c.fecha_eliminacion AS "fechaEliminacion",
        c.fecha_purga AS "fechaPurga", c.id_eliminador AS "idEliminador",
        c.id_proyecto AS "idProyecto", c.id_creador AS "idCreador"
    `, [idProyecto, idUsuario, idConversacion]);
    // TypeORM/Postgres devuelve [filas, cantidad] para UPDATE ... RETURNING.
    // No enviar esa tupla al frontend como si fuera una conversación.
    return resultado[0]?.[0] ?? null;
  }

  async restaurarPapelera(idProyecto: string, idUsuario: string, idConversacion: string): Promise<ConversacionIa | null> {
    const resultado = await this.dataSource.query<[ConversacionIa[], number]>(`
      UPDATE conversacion_ia c SET estado = c.estado_anterior,
        estado_anterior = NULL, fecha_eliminacion = NULL, fecha_purga = NULL,
        id_eliminador = NULL, fecha_actualizacion = CURRENT_TIMESTAMP
      FROM proyecto p WHERE c.id = $3 AND c.id_proyecto = $1
        AND p.id = c.id_proyecto AND p.estado = 'ACTIVO'
        AND c.estado = 'ELIMINADA' AND c.fecha_purga > CURRENT_TIMESTAMP
        AND c.estado_anterior IN ('ACTIVA', 'ARCHIVADA')
        AND EXISTS (
          SELECT 1 FROM membresia mb JOIN rol r ON r.id = mb.id_rol
          WHERE mb.id_proyecto = p.id AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA'
            AND r.id_proyecto = p.id AND r.nombre = 'Anfitrión'
            AND r.es_predeterminado = TRUE AND r.estado = 'ACTIVO'
        )
      RETURNING c.id, c.titulo, c.fecha_creacion AS "fechaCreacion",
        c.fecha_actualizacion AS "fechaActualizacion", c.estado,
        c.estado_anterior AS "estadoAnterior", c.fecha_eliminacion AS "fechaEliminacion",
        c.fecha_purga AS "fechaPurga", c.id_eliminador AS "idEliminador",
        c.id_proyecto AS "idProyecto", c.id_creador AS "idCreador"
    `, [idProyecto, idUsuario, idConversacion]);
    // TypeORM/Postgres devuelve [filas, cantidad] para UPDATE ... RETURNING.
    // No enviar esa tupla al frontend como si fuera una conversación.
    return resultado[0]?.[0] ?? null;
  }

  async crear(
    idProyecto: string,
    idUsuario: string,
    titulo: string,
  ): Promise<ConversacionIa | null> {
    const rows = await this.dataSource.query<ConversacionIa[]>(
      `
      INSERT INTO conversacion_ia (titulo, id_proyecto, id_creador)
      SELECT $3, p.id, $2 FROM proyecto p
      WHERE p.id = $1 AND p.estado = 'ACTIVO'
        AND EXISTS (SELECT 1 FROM membresia m WHERE m.id_usuario = $2 AND m.id_proyecto = p.id AND m.estado = 'ACTIVA')
      RETURNING id, titulo, fecha_creacion AS "fechaCreacion", fecha_actualizacion AS "fechaActualizacion",
        estado, id_proyecto AS "idProyecto", id_creador AS "idCreador"
    `,
      [idProyecto, idUsuario, titulo],
    );
    return rows[0] ?? null;
  }

  async listar(
    idProyecto: string,
    idUsuario: string,
    limite: number,
    desplazamiento: number,
  ): Promise<ConversacionIa[]> {
    return this.dataSource.query<ConversacionIa[]>(
      `
      SELECT c.id, c.titulo, c.fecha_creacion AS "fechaCreacion", c.fecha_actualizacion AS "fechaActualizacion",
        c.estado, c.id_proyecto AS "idProyecto", c.id_creador AS "idCreador"
      FROM conversacion_ia c JOIN proyecto p ON p.id = c.id_proyecto
      WHERE c.id_proyecto = $1 AND p.estado = 'ACTIVO' AND c.estado <> 'ELIMINADA'
        AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = c.id_proyecto AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA')
      ORDER BY c.fecha_actualizacion DESC, c.id DESC LIMIT $3 OFFSET $4
    `,
      [idProyecto, idUsuario, limite, desplazamiento],
    );
  }

  async obtener(
    idProyecto: string,
    idUsuario: string,
    idConversacion: string,
  ): Promise<ConversacionIa | null> {
    const rows = await this.dataSource.query<ConversacionIa[]>(
      `
      SELECT c.id, c.titulo, c.fecha_creacion AS "fechaCreacion", c.fecha_actualizacion AS "fechaActualizacion",
        c.estado, c.id_proyecto AS "idProyecto", c.id_creador AS "idCreador"
      FROM conversacion_ia c JOIN proyecto p ON p.id = c.id_proyecto
      WHERE c.id = $3 AND c.id_proyecto = $1 AND p.estado = 'ACTIVO' AND c.estado <> 'ELIMINADA'
        AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = c.id_proyecto AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA')
    `,
      [idProyecto, idUsuario, idConversacion],
    );
    return rows[0] ?? null;
  }

  async archivar(
    idProyecto: string,
    idUsuario: string,
    idConversacion: string,
  ): Promise<ConversacionIa | null> {
    const resultado = await this.dataSource.query<[ConversacionIa[], number]>(
      `
      UPDATE conversacion_ia c SET estado = 'ARCHIVADA', fecha_actualizacion = CURRENT_TIMESTAMP
      FROM proyecto p WHERE c.id = $3 AND c.id_proyecto = $1 AND p.id = c.id_proyecto
        AND p.estado = 'ACTIVO' AND c.estado = 'ACTIVA'
        AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = c.id_proyecto AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA')
      RETURNING c.id, c.titulo, c.fecha_creacion AS "fechaCreacion", c.fecha_actualizacion AS "fechaActualizacion",
        c.estado, c.id_proyecto AS "idProyecto", c.id_creador AS "idCreador"
    `,
      [idProyecto, idUsuario, idConversacion],
    );
    // UPDATE ... RETURNING también produce [filas, cantidad] al archivar.
    return resultado[0]?.[0] ?? null;
  }

  async enviarMensajeUsuario(
    idProyecto: string,
    idConversacion: string,
    idUsuario: string,
    contenido: string,
    identificadorSolicitud: string,
  ): Promise<MensajeIa | null> {
    return this.dataSource.transaction(
      async (manager): Promise<MensajeIa | null> => {
        const rows = await manager.query<MensajeIa[]>(
          `
        INSERT INTO mensaje_ia (contenido, tipo_emisor, identificador_solicitud, id_conversacion, id_usuario)
        SELECT $4, 'USUARIO', $5, c.id, $3 FROM conversacion_ia c
        JOIN proyecto p ON p.id = c.id_proyecto
        WHERE c.id = $2 AND c.id_proyecto = $1 AND c.estado = 'ACTIVA' AND p.estado = 'ACTIVO'
          AND EXISTS (SELECT 1 FROM membresia m WHERE m.id_usuario = $3 AND m.id_proyecto = c.id_proyecto AND m.estado = 'ACTIVA')
        RETURNING id, contenido, tipo_emisor AS "tipoEmisor", fecha_creacion AS "fechaCreacion",
          identificador_solicitud AS "identificadorSolicitud", id_conversacion AS "idConversacion", id_usuario AS "idUsuario"
      `,
          [
            idProyecto,
            idConversacion,
            idUsuario,
            contenido,
            identificadorSolicitud,
          ],
        );
        if (!rows[0]) return null;
        await manager.query(
          `
        UPDATE conversacion_ia SET fecha_actualizacion = GREATEST(fecha_creacion, CURRENT_TIMESTAMP)
        WHERE id = $1 AND id_proyecto = $2
      `,
          [idConversacion, idProyecto],
        );
        return rows[0];
      },
    );
  }

  async registrarRespuestaIa(
    idProyecto: string,
    idConversacion: string,
    idUsuario: string,
    identificadorSolicitud: string,
    contenido: string,
  ): Promise<MensajeIa | null> {
    return this.dataSource.transaction(async (manager): Promise<MensajeIa | null> => {
      // El bloqueo serializa el archivado y respuestas simultáneas de una
      // misma conversación. Nunca se inserta una respuesta huérfana.
      const conversaciones = await manager.query<Array<{ id: string }>>(
        `
        SELECT c.id FROM conversacion_ia c
        JOIN proyecto p ON p.id = c.id_proyecto
        WHERE c.id = $2 AND c.id_proyecto = $1
          AND c.estado = 'ACTIVA' AND p.estado = 'ACTIVO'
          AND EXISTS (
            SELECT 1 FROM membresia mb
            WHERE mb.id_proyecto = c.id_proyecto AND mb.id_usuario = $3
              AND mb.estado = 'ACTIVA'
          )
        FOR UPDATE OF c
        `,
        [idProyecto, idConversacion, idUsuario],
      );
      if (!conversaciones[0]) return null;

      const rows = await manager.query<MensajeIa[]>(
        `
        INSERT INTO mensaje_ia
          (contenido, tipo_emisor, identificador_solicitud, id_conversacion, id_usuario)
        SELECT $5, 'IA', $4, c.id, NULL
        FROM conversacion_ia c
        JOIN mensaje_ia humano ON humano.id_conversacion = c.id
        WHERE c.id_proyecto = $1 AND c.id = $2 AND c.estado = 'ACTIVA'
          AND EXISTS (
            SELECT 1 FROM membresia mb WHERE mb.id_proyecto = c.id_proyecto
              AND mb.id_usuario = $3 AND mb.estado = 'ACTIVA'
          )
          AND humano.id_usuario = $3 AND humano.tipo_emisor = 'USUARIO'
          AND humano.identificador_solicitud = $4
          AND NOT EXISTS (
            SELECT 1 FROM mensaje_ia respuesta
            WHERE respuesta.id_conversacion = c.id
              AND respuesta.tipo_emisor = 'IA'
              AND respuesta.identificador_solicitud = $4
          )
        RETURNING id, contenido, tipo_emisor AS "tipoEmisor", fecha_creacion AS "fechaCreacion",
          identificador_solicitud AS "identificadorSolicitud", id_conversacion AS "idConversacion", id_usuario AS "idUsuario"
        `,
        [idProyecto, idConversacion, idUsuario, identificadorSolicitud, contenido],
      );
      if (!rows[0]) return null;
      await manager.query(
        `UPDATE conversacion_ia SET fecha_actualizacion = GREATEST(fecha_creacion, CURRENT_TIMESTAMP)
         WHERE id = $1 AND id_proyecto = $2`,
        [idConversacion, idProyecto],
      );
      return rows[0];
    });
  }

  async listarMensajes(
    idProyecto: string,
    idUsuario: string,
    idConversacion: string,
    limite: number,
    desplazamiento: number,
  ): Promise<MensajeIa[] | null> {
    // La pertenencia se confirma antes de consultar mensajes; un id de otro proyecto equivale a 404.
    const existe = await this.obtener(idProyecto, idUsuario, idConversacion);
    if (!existe) return null;
    // Recupera la página más reciente en orden de lectura ascendente.
    const rows = await this.dataSource.query<MensajeIa[]>(
      `
      SELECT m.id, m.contenido, m.tipo_emisor AS "tipoEmisor", m.fecha_creacion AS "fechaCreacion",
        m.identificador_solicitud AS "identificadorSolicitud", m.id_conversacion AS "idConversacion", m.id_usuario AS "idUsuario"
      FROM mensaje_ia m JOIN conversacion_ia c ON c.id = m.id_conversacion
      WHERE c.id = $3 AND c.id_proyecto = $1 AND c.estado <> 'ELIMINADA'
        AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = c.id_proyecto AND mb.id_usuario = $2 AND mb.estado = 'ACTIVA')
      ORDER BY m.fecha_creacion DESC, m.id DESC LIMIT $4 OFFSET $5
    `,
      [idProyecto, idUsuario, idConversacion, limite, desplazamiento],
    );
    return rows.reverse();
  }
}
