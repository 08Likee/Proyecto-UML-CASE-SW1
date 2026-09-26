import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { type AccesoProyecto } from '../../../domain/models/acceso-proyecto';

import { type InvitacionRecibida } from '../../../domain/models/invitacion';

import {
  AccesoProyectoRepository,
  type ResultadoAceptarInvitacion,
  type ResultadoRechazarInvitacion,
} from '../../../domain/repositories/acceso-proyecto.repository';

@Injectable()
export class TypeOrmAccesoProyectoRepository implements AccesoProyectoRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listarInvitacionesPendientes(
    idUsuario: string,
  ): Promise<InvitacionRecibida[]> {
    await this.dataSource.query(
      `
        UPDATE invitacion
        SET estado = 'EXPIRADA'
        WHERE
          id_usuario = $1
          AND estado = 'PENDIENTE'
          AND fecha_expiracion <=
            CURRENT_TIMESTAMP
      `,
      [idUsuario],
    );

    return this.dataSource.query<InvitacionRecibida[]>(
      `
        SELECT
          i.id AS "id",
          i.estado AS "estado",
          i.fecha_creacion
            AS "fechaCreacion",
          i.fecha_expiracion
            AS "fechaExpiracion",

          p.id AS "idProyecto",
          p.nombre
            AS "proyectoNombre",

          r.id AS "idRol",
          r.nombre
            AS "rolNombre"

        FROM invitacion i

        INNER JOIN proyecto p
          ON p.id = i.id_proyecto

        INNER JOIN rol r
          ON r.id = i.id_rol
          AND r.id_proyecto =
            i.id_proyecto

        WHERE
          i.id_usuario = $1
          AND i.estado =
            'PENDIENTE'

        ORDER BY
          i.fecha_creacion DESC
      `,
      [idUsuario],
    );
  }

  async aceptarInvitacion(
    idInvitacion: string,
    idUsuario: string,
  ): Promise<ResultadoAceptarInvitacion> {
    return this.dataSource.transaction(async (manager) => {
      const invitaciones = await manager.query<
        Array<{
          id: string;
          estado: string;
          fechaExpiracion: Date;
          idProyecto: string;
          idRol: string;
        }>
      >(
        `
              SELECT
                id,
                estado,
                fecha_expiracion
                  AS "fechaExpiracion",
                id_proyecto
                  AS "idProyecto",
                id_rol
                  AS "idRol"
              FROM invitacion
              WHERE
                id = $1
                AND id_usuario = $2
              FOR UPDATE
            `,
        [idInvitacion, idUsuario],
      );

      const invitacion = invitaciones[0];

      if (!invitacion || invitacion.estado !== 'PENDIENTE') {
        return {
          tipo: 'NO_DISPONIBLE',
        };
      }

      if (new Date(invitacion.fechaExpiracion).getTime() <= Date.now()) {
        await manager.query(
          `
              UPDATE invitacion
              SET estado = 'EXPIRADA'
              WHERE id = $1
            `,
          [idInvitacion],
        );

        return {
          tipo: 'NO_DISPONIBLE',
        };
      }

      const proyectos = await manager.query<
        Array<{
          id: string;
        }>
      >(
        `
              SELECT id
              FROM proyecto
              WHERE
                id = $1
                AND estado = 'ACTIVO'
              LIMIT 1
            `,
        [invitacion.idProyecto],
      );

      if (!proyectos[0]) {
        return {
          tipo: 'PROYECTO_NO_DISPONIBLE',
        };
      }

      const roles = await manager.query<
        Array<{
          id: string;
        }>
      >(
        `
              SELECT id
              FROM rol
              WHERE
                id = $1
                AND id_proyecto = $2
                AND estado = 'ACTIVO'
              LIMIT 1
            `,
        [invitacion.idRol, invitacion.idProyecto],
      );

      if (!roles[0]) {
        return {
          tipo: 'ROL_NO_DISPONIBLE',
        };
      }

      const membresias = await manager.query<
        Array<{
          id: string;
        }>
      >(
        `
              SELECT id
              FROM membresia
              WHERE
                id_usuario = $1
                AND id_proyecto = $2
              LIMIT 1
            `,
        [idUsuario, invitacion.idProyecto],
      );

      if (membresias[0]) {
        return {
          tipo: 'YA_MIEMBRO',
        };
      }

      const creadas = await manager.query<
        Array<{
          id: string;
        }>
      >(
        `
              INSERT INTO membresia (
                id_usuario,
                id_proyecto,
                id_rol
              )
              VALUES ($1, $2, $3)
              RETURNING id
            `,
        [idUsuario, invitacion.idProyecto, invitacion.idRol],
      );

      const membresia = creadas[0];

      await manager.query(
        `
            UPDATE invitacion
            SET
              estado = 'ACEPTADA',
              fecha_aceptacion =
                CURRENT_TIMESTAMP
            WHERE id = $1
          `,
        [idInvitacion],
      );

      return {
        tipo: 'ACEPTADA',
        datos: {
          idInvitacion,
          idProyecto: invitacion.idProyecto,
          idMembresia: membresia.id,
          idRol: invitacion.idRol,
        },
      };
    });
  }

  async rechazarInvitacion(
    idInvitacion: string,
    idUsuario: string,
  ): Promise<ResultadoRechazarInvitacion> {
    return this.dataSource.transaction(async (manager) => {
      const filas = await manager.query<
        Array<{
          id: string;
          estado: string;
          fechaExpiracion: Date;
        }>
      >(
        `
              SELECT
                id,
                estado,
                fecha_expiracion
                  AS "fechaExpiracion"
              FROM invitacion
              WHERE
                id = $1
                AND id_usuario = $2
              FOR UPDATE
            `,
        [idInvitacion, idUsuario],
      );

      const invitacion = filas[0];

      if (!invitacion || invitacion.estado !== 'PENDIENTE') {
        return 'NO_DISPONIBLE';
      }

      if (new Date(invitacion.fechaExpiracion).getTime() <= Date.now()) {
        await manager.query(
          `
              UPDATE invitacion
              SET estado = 'EXPIRADA'
              WHERE id = $1
            `,
          [idInvitacion],
        );

        return 'NO_DISPONIBLE';
      }

      await manager.query(
        `
            UPDATE invitacion
            SET
              estado = 'RECHAZADA',
              fecha_rechazo =
                CURRENT_TIMESTAMP
            WHERE id = $1
          `,
        [idInvitacion],
      );

      return 'RECHAZADA';
    });
  }

  async obtenerAcceso(
    idProyecto: string,
    idUsuario: string,
  ): Promise<AccesoProyecto | null> {
    const filas = await this.dataSource.query<
      Array<{
        idProyecto: string;
        proyectoNombre: string;
        proyectoDescripcion: string | null;
        proyectoConfiguracion: Record<string, unknown>;
        proyectoEstado: string;

        idMembresia: string;
        membresiaEstado: string;

        idRol: string;
        rolNombre: string;
        rolPredeterminado: boolean;
      }>
    >(
      `
          SELECT
            p.id AS "idProyecto",
            p.nombre
              AS "proyectoNombre",
            p.descripcion
              AS "proyectoDescripcion",
            p.configuracion
              AS "proyectoConfiguracion",
            p.estado
              AS "proyectoEstado",

            m.id
              AS "idMembresia",
            m.estado
              AS "membresiaEstado",

            r.id AS "idRol",
            r.nombre AS "rolNombre",
            r.es_predeterminado
              AS "rolPredeterminado"

          FROM membresia m

          INNER JOIN proyecto p
            ON p.id = m.id_proyecto

          INNER JOIN rol r
            ON r.id = m.id_rol
            AND r.id_proyecto =
              m.id_proyecto

          WHERE
            m.id_usuario = $1
            AND m.id_proyecto = $2
            AND m.estado = 'ACTIVA'
            AND p.estado = 'ACTIVO'
            AND r.estado = 'ACTIVO'

          LIMIT 1
        `,
      [idUsuario, idProyecto],
    );

    const acceso = filas[0];

    if (!acceso) {
      return null;
    }

    const permisos = await this.dataSource.query<AccesoProyecto['permisos']>(
      `
          SELECT
            p.id AS "idPermiso",
            p.nombre AS "nombre",
            p.recurso AS "recurso",
            p.accion AS "accion",

            CASE
              WHEN
                pm.tipo_asignacion =
                  'DENEGAR'
                AND pm.estado =
                  'ACTIVO'
                THEN FALSE

              WHEN
                pm.tipo_asignacion =
                  'CONCEDER'
                AND pm.estado =
                  'ACTIVO'
                THEN TRUE

              WHEN rp.id IS NOT NULL
                THEN TRUE

              ELSE FALSE
            END AS "permitido",

            CASE
              WHEN
                pm.tipo_asignacion =
                  'DENEGAR'
                AND pm.estado =
                  'ACTIVO'
                THEN 'DENEGAR'

              WHEN
                pm.tipo_asignacion =
                  'CONCEDER'
                AND pm.estado =
                  'ACTIVO'
                THEN 'CONCEDER'

              WHEN rp.id IS NOT NULL
                THEN 'ROL'

              ELSE 'NINGUNO'
            END AS "fuente"

          FROM permiso p

          LEFT JOIN rol_permiso rp
            ON rp.id_rol = $1
            AND rp.id_permiso = p.id

          LEFT JOIN permiso_membresia pm
            ON pm.id_membresia = $2
            AND pm.id_permiso = p.id

          WHERE
            p.estado = 'ACTIVO'

          ORDER BY
            p.recurso ASC,
            p.accion ASC
        `,
      [acceso.idRol, acceso.idMembresia],
    );

    return {
      proyecto: {
        id: acceso.idProyecto,
        nombre: acceso.proyectoNombre,
        descripcion: acceso.proyectoDescripcion,
        configuracion: acceso.proyectoConfiguracion,
        estado: acceso.proyectoEstado,
      },

      membresia: {
        id: acceso.idMembresia,
        estado: acceso.membresiaEstado,
      },

      rol: {
        id: acceso.idRol,
        nombre: acceso.rolNombre,
        esPredeterminado: acceso.rolPredeterminado,
      },

      permisos,
    };
  }
}
