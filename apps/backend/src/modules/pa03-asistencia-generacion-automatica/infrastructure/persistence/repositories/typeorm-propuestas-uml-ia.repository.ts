import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AplicacionPropuestaConflictivaError } from '../../../domain/errors/aplicacion-propuesta-conflictiva.error';
import { aplicarPropuestaAlContenido } from '../../../domain/services/aplicar-propuesta-uml-ia';
import { validarPropuestaUmlIa, PropuestaUmlInvalidaError } from '../../../domain/services/validar-propuesta-uml-ia';
import { separarEstadoColaborativo, agregarEstadoColaborativo } from '../../../../pa02-modelado-interoperabilidad-uml/domain/services/estado-colaborativo-modelo-uml';
import { validarContenidoModeloUml } from '../../../../pa02-modelado-interoperabilidad-uml/domain/services/validar-contenido-modelo-uml';
import type { ModeloUml, ModeloUmlContenido } from '../../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import { actualizarEstadoYjsPropuesta } from '../../collaboration/actualizar-estado-yjs-propuesta';
import type { PropuestaUmlIa } from '../../../domain/models/propuesta-uml-ia';
import { PropuestasUmlIaRepository, type CrearPropuestaUmlEntrada, type ResultadoAplicacionUmlIa } from '../../../application/ports/propuestas-uml-ia.repository';

type Fila = Omit<PropuestaUmlIa, 'vigente'>;

function estadoVigente(fila: Fila): PropuestaUmlIa {
  return { ...fila, vigente: Number(fila.versionModelo) === Number(fila.versionActual) };
}

const COLUMNAS = `
  p.id, p.id_proyecto AS "idProyecto", p.id_modelo AS "idModelo",
  p.id_conversacion AS "idConversacion", p.id_creador AS "idCreador",
  p.id_mensaje_usuario AS "idMensajeUsuario", p.version_modelo AS "versionModelo",
  m.version AS "versionActual", p.estado, p.datos, p.fecha_creacion AS "fechaCreacion"
`;

/** Toda consulta usa idProyecto + idModelo + idConversacion y membresía activa. */
@Injectable()
export class TypeOrmPropuestasUmlIaRepository extends PropuestasUmlIaRepository {
  constructor(private readonly db: DataSource) { super(); }

  async crear(e: CrearPropuestaUmlEntrada): Promise<PropuestaUmlIa | null> {
    const filas = await this.db.query<Array<{ id: string }>>(`
      INSERT INTO propuesta_uml_ia
        (id_proyecto, id_modelo, id_conversacion, id_creador,
         id_mensaje_usuario, version_modelo, datos)
      SELECT $1, m.id, c.id, $4, msg.id, $6, $7::jsonb
      FROM modelo_uml m
      JOIN conversacion_ia c ON c.id_proyecto = m.id_proyecto
      JOIN mensaje_ia msg ON msg.id_conversacion = c.id
      JOIN proyecto pr ON pr.id = m.id_proyecto
      WHERE m.id = $2 AND m.id_proyecto = $1 AND m.estado = 'ACTIVO'
        AND m.version = $6 AND c.id = $3 AND c.estado = 'ACTIVA'
        AND pr.estado = 'ACTIVO' AND msg.id = $5
        AND msg.tipo_emisor = 'USUARIO' AND msg.id_usuario = $4
        AND EXISTS (SELECT 1 FROM membresia mb
          WHERE mb.id_proyecto = $1 AND mb.id_usuario = $4 AND mb.estado = 'ACTIVA')
      RETURNING id
    `, [e.idProyecto, e.idModelo, e.idConversacion, e.idUsuario,
        e.idMensajeUsuario, e.versionModelo, JSON.stringify(e.datos)]);
    if (!filas[0]) return null;
    return this.obtenerPorId(e.idUsuario, e.idProyecto, e.idModelo, e.idConversacion, filas[0].id);
  }

  private async obtenerPorId(idUsuario: string, idProyecto: string, idModelo: string, idConversacion: string, idPropuesta: string): Promise<PropuestaUmlIa | null> {
    const filas = await this.db.query<Fila[]>(`
      SELECT ${COLUMNAS}
      FROM propuesta_uml_ia p
      JOIN modelo_uml m ON m.id = p.id_modelo AND m.id_proyecto = p.id_proyecto
      JOIN conversacion_ia c ON c.id = p.id_conversacion AND c.id_proyecto = p.id_proyecto
      JOIN proyecto pr ON pr.id = p.id_proyecto
      WHERE p.id = $5 AND p.id_proyecto = $1 AND p.id_modelo = $2 AND p.id_conversacion = $3
        AND m.estado = 'ACTIVO' AND pr.estado = 'ACTIVO' AND c.estado <> 'ELIMINADA'
        AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = p.id_proyecto
          AND mb.id_usuario = $4 AND mb.estado = 'ACTIVA')
    `, [idProyecto, idModelo, idConversacion, idUsuario, idPropuesta]);
    return filas[0] ? estadoVigente(filas[0]) : null;
  }

  async listar(idUsuario: string, idProyecto: string, idModelo: string, idConversacion: string): Promise<PropuestaUmlIa[]> {
    const filas = await this.db.query<Fila[]>(`
      SELECT ${COLUMNAS}
      FROM propuesta_uml_ia p
      JOIN modelo_uml m ON m.id = p.id_modelo AND m.id_proyecto = p.id_proyecto
      JOIN conversacion_ia c ON c.id = p.id_conversacion AND c.id_proyecto = p.id_proyecto
      JOIN proyecto pr ON pr.id = p.id_proyecto
      WHERE p.id_proyecto = $1 AND p.id_modelo = $2 AND p.id_conversacion = $3
        AND m.estado = 'ACTIVO' AND pr.estado = 'ACTIVO' AND c.estado <> 'ELIMINADA'
        AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = p.id_proyecto
          AND mb.id_usuario = $4 AND mb.estado = 'ACTIVA')
      ORDER BY p.fecha_creacion DESC, p.id DESC LIMIT 30
    `, [idProyecto, idModelo, idConversacion, idUsuario]);
    return filas.map(estadoVigente);
  }

  /** Modelo y propuesta cambian dentro de UNA transacción PostgreSQL con bloqueo FOR UPDATE. */
  async aplicar(idUsuario: string, idProyecto: string, idModelo: string, idConversacion: string, idPropuesta: string): Promise<ResultadoAplicacionUmlIa | null> {
    return this.db.transaction(async (manager) => {
      type FilaAplicar = Fila & { contenidoModelo: ModeloUmlContenido; nombreModelo: string; descripcionModelo: string | null };
      const filas = await manager.query<FilaAplicar[]>(`
        SELECT ${COLUMNAS}, m.contenido AS "contenidoModelo",
          m.nombre AS "nombreModelo", m.descripcion AS "descripcionModelo"
        FROM modelo_uml m
        JOIN propuesta_uml_ia p ON p.id_modelo = m.id AND p.id_proyecto = m.id_proyecto
        JOIN conversacion_ia c ON c.id = p.id_conversacion AND c.id_proyecto = p.id_proyecto
        JOIN proyecto pr ON pr.id = p.id_proyecto
        WHERE p.id_proyecto = $1 AND p.id_modelo = $2 AND p.id_conversacion = $3
          AND p.id = $5 AND m.estado = 'ACTIVO' AND c.estado = 'ACTIVA'
          AND pr.estado = 'ACTIVO'
          AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = $1
            AND mb.id_usuario = $4 AND mb.estado = 'ACTIVA')
        FOR UPDATE OF m, p
      `, [idProyecto, idModelo, idConversacion, idUsuario, idPropuesta]);
      const fila = filas[0];
      if (!fila) return null;
      if (fila.estado !== 'PENDIENTE') {
        throw new AplicacionPropuestaConflictivaError('La propuesta ya fue aplicada o rechazada.');
      }
      if (Number(fila.versionActual) !== Number(fila.versionModelo)) {
        throw new AplicacionPropuestaConflictivaError(`La propuesta fue creada en v${fila.versionModelo} y el modelo ya está en v${fila.versionActual}. Generá una nueva propuesta.`);
      }
      const { contenido, estadoYjsBase64 } = separarEstadoColaborativo(fila.contenidoModelo);
      // No es seguro reconstruir un CRDT independiente mientras haya participantes conectados:
      // el servicio de colaboración debe haber persistido primero su snapshot inicial.
      if (!estadoYjsBase64) {
        throw new AplicacionPropuestaConflictivaError('Aún no existe un snapshot colaborativo persistido. Reconectá el modelo y volvé a generar la propuesta sobre la versión vigente.');
      }
      const modelo: ModeloUml = {
        id: idModelo, idProyecto, nombre: fila.nombreModelo,
        descripcion: fila.descripcionModelo, contenido, version: Number(fila.versionActual),
        estado: 'ACTIVO', fechaCreacion: new Date(0), fechaActualizacion: new Date(),
      };
      let nuevosCambios;
      try { nuevosCambios = validarPropuestaUmlIa(fila.datos, modelo); }
      catch (error: unknown) {
        if (error instanceof PropuestaUmlInvalidaError) {
          throw new AplicacionPropuestaConflictivaError('La propuesta ya no es compatible con el modelo.');
        }
        throw error;
      }
      const actualizado = validarContenidoModeloUml(aplicarPropuestaAlContenido(contenido, nuevosCambios));
      let nuevoEstado: string;
      try { nuevoEstado = actualizarEstadoYjsPropuesta(contenido, actualizado, estadoYjsBase64); }
      catch {
        throw new AplicacionPropuestaConflictivaError('El documento colaborativo no coincide con el modelo persistido. Sincronizá antes de aplicar.');
      }
      const nuevoContenido = agregarEstadoColaborativo(actualizado, nuevoEstado);
      const modificadas = await manager.query<Array<{ id: string; version: number }>>(`
        UPDATE modelo_uml SET contenido = $3::jsonb, version = version + 1,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_proyecto = $1 AND id = $2 AND version = $4 AND estado = 'ACTIVO'
        RETURNING id, version
      `, [idProyecto, idModelo, JSON.stringify(nuevoContenido), fila.versionModelo]);
      if (!modificadas[0]) throw new AplicacionPropuestaConflictivaError('El modelo cambió mientras se aplicaba la propuesta.');
      const confirmadas = await manager.query<Array<{ id: string }>>(`
        UPDATE propuesta_uml_ia SET estado = 'APLICADA'
        WHERE id = $1 AND estado = 'PENDIENTE' RETURNING id
      `, [idPropuesta]);
      if (!confirmadas[0]) throw new AplicacionPropuestaConflictivaError('La propuesta cambió durante su aplicación.');
      const nuevaVersion = Number(modificadas[0].version);
      return {
        propuesta: estadoVigente({ ...fila, estado: 'APLICADA', versionActual: nuevaVersion }),
        modelo: { id: idModelo, version: nuevaVersion, contenido: actualizado },
        estadoYjsBase64: nuevoEstado,
      };
    });
  }

  async rechazar(idUsuario: string, idProyecto: string, idModelo: string, idConversacion: string, idPropuesta: string): Promise<PropuestaUmlIa | null> {
    const filas = await this.db.query<Array<{ id: string }>>(`
      UPDATE propuesta_uml_ia p SET estado = 'RECHAZADA'
      FROM modelo_uml m, conversacion_ia c, proyecto pr
      WHERE p.id = $5 AND p.id_proyecto = $1 AND p.id_modelo = $2
        AND p.id_conversacion = $3 AND p.estado = 'PENDIENTE'
        AND m.id = p.id_modelo AND m.id_proyecto = $1 AND m.estado = 'ACTIVO'
        AND c.id = p.id_conversacion AND c.id_proyecto = $1 AND c.estado = 'ACTIVA'
        AND pr.id = p.id_proyecto AND pr.estado = 'ACTIVO'
        AND EXISTS (SELECT 1 FROM membresia mb WHERE mb.id_proyecto = $1
          AND mb.id_usuario = $4 AND mb.estado = 'ACTIVA')
      RETURNING p.id
    `, [idProyecto, idModelo, idConversacion, idUsuario, idPropuesta]);
    if (!filas[0]) return null;
    return this.obtenerPorId(idUsuario, idProyecto, idModelo, idConversacion, idPropuesta);
  }
}
