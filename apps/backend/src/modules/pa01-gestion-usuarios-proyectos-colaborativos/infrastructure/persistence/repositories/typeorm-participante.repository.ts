import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';

import {
  type Invitacion,
  type InvitacionEstado,
} from '../../../domain/models/invitacion';

import {
  type DetalleMembresia,
  type ParticipanteProyecto,
  type PermisoEfectivoParticipante,
} from '../../../domain/models/participante';

import {
  type CrearInvitacionDatos,
  ParticipanteRepository,
  type TipoAsignacionPermiso,
  type UsuarioInvitable,
} from '../../../domain/repositories/participante.repository';

import { InvitacionEntity } from '../entities/invitacion.entity';
import { MembresiaEntity } from '../entities/membresia.entity';

@Injectable()
export class TypeOrmParticipanteRepository implements ParticipanteRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listarActivos(idProyecto: string): Promise<ParticipanteProyecto[]> {
    return this.dataSource.query<ParticipanteProyecto[]>(
      `
        SELECT
          m.id AS "idMembresia",
          u.id AS "idUsuario",
          u.nombre AS "nombre",
          u.apellido AS "apellido",
          u.correo AS "correo",
          m.estado AS "estadoMembresia",
          r.id AS "idRol",
          r.nombre AS "rolNombre",
          r.es_predeterminado AS "rolPredeterminado"
        FROM membresia m
        INNER JOIN usuario u
          ON u.id = m.id_usuario
        INNER JOIN rol r
          ON r.id = m.id_rol
          AND r.id_proyecto = m.id_proyecto
        WHERE
          m.id_proyecto = $1
          AND m.estado = 'ACTIVA'
        ORDER BY
          r.es_predeterminado DESC,
          u.nombre ASC,
          u.apellido ASC
      `,
      [idProyecto],
    );
  }

  async buscarUsuarioPorCorreo(
    correo: string,
  ): Promise<UsuarioInvitable | null> {
    const filas = await this.dataSource.query<UsuarioInvitable[]>(
      `
          SELECT
            id,
            nombre,
            apellido,
            correo
          FROM usuario
          WHERE
            LOWER(correo) = LOWER($1)
            AND estado = 'ACTIVO'
          LIMIT 1
        `,
      [correo],
    );

    return filas[0] ?? null;
  }

  async tieneMembresiaRegistrada(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean> {
    const filas = await this.dataSource.query<
      Array<{
        existe: boolean;
      }>
    >(
      `
          SELECT EXISTS (
            SELECT 1
            FROM membresia
            WHERE
              id_proyecto = $1
              AND id_usuario = $2
          ) AS existe
        `,
      [idProyecto, idUsuario],
    );

    return Boolean(filas[0]?.existe);
  }

  async tieneInvitacionPendiente(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean> {
    const filas = await this.dataSource.query<
      Array<{
        existe: boolean;
      }>
    >(
      `
          SELECT EXISTS (
            SELECT 1
            FROM invitacion
            WHERE
              id_proyecto = $1
              AND id_usuario = $2
              AND estado = 'PENDIENTE'
          ) AS existe
        `,
      [idProyecto, idUsuario],
    );

    return Boolean(filas[0]?.existe);
  }

  async rolAsignableExiste(
    idProyecto: string,
    idRol: string,
  ): Promise<boolean> {
    const filas = await this.dataSource.query<
      Array<{
        existe: boolean;
      }>
    >(
      `
          SELECT EXISTS (
            SELECT 1
            FROM rol
            WHERE
              id = $1
              AND id_proyecto = $2
              AND estado = 'ACTIVO'
              AND NOT (
                es_predeterminado = TRUE
                AND nombre = 'Anfitrión'
              )
          ) AS existe
        `,
      [idRol, idProyecto],
    );

    return Boolean(filas[0]?.existe);
  }

  async crearInvitacion(
    datos: CrearInvitacionDatos,
  ): Promise<Invitacion | null> {
    try {
      const repository = this.dataSource.getRepository(InvitacionEntity);

      const entity = await repository.save(
        repository.create({
          token: datos.token,
          fechaExpiracion: datos.fechaExpiracion,
          idProyecto: datos.idProyecto,
          idUsuario: datos.idUsuario,
          idRol: datos.idRol,
        }),
      );

      return {
        id: entity.id,
        estado: entity.estado as InvitacionEstado,
        fechaCreacion: entity.fechaCreacion,
        fechaExpiracion: entity.fechaExpiracion,
        idProyecto: entity.idProyecto,
        idUsuario: entity.idUsuario,
        idRol: entity.idRol,
      };
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (
          error.driverError as {
            code?: string;
          }
        )?.code === '23505'
      ) {
        return null;
      }

      throw error;
    }
  }

  async buscarMembresiaActiva(
    idProyecto: string,
    idMembresia: string,
  ): Promise<DetalleMembresia | null> {
    const filas = await this.dataSource.query<DetalleMembresia[]>(
      `
          SELECT
            m.id AS "idMembresia",
            m.id_usuario AS "idUsuario",
            r.id AS "idRol",
            r.nombre AS "rolNombre",
            r.es_predeterminado AS "rolPredeterminado"
          FROM membresia m
          INNER JOIN rol r
            ON r.id = m.id_rol
            AND r.id_proyecto = m.id_proyecto
          WHERE
            m.id = $1
            AND m.id_proyecto = $2
            AND m.estado = 'ACTIVA'
          LIMIT 1
        `,
      [idMembresia, idProyecto],
    );

    return filas[0] ?? null;
  }

  async cambiarRol(
    idProyecto: string,
    idMembresia: string,
    idRol: string,
  ): Promise<boolean> {
    const resultado = await this.dataSource
      .createQueryBuilder()
      .update(MembresiaEntity)
      .set({
        idRol,
        fechaUltimaActividad: new Date(),
      })
      .where('id = :idMembresia', {
        idMembresia,
      })
      .andWhere('id_proyecto = :idProyecto', {
        idProyecto,
      })
      .andWhere('estado = :estado', {
        estado: 'ACTIVA',
      })
      .execute();

    return resultado.affected === 1;
  }

  async retirar(idProyecto: string, idMembresia: string): Promise<boolean> {
    const resultado = await this.dataSource
      .createQueryBuilder()
      .update(MembresiaEntity)
      .set({
        estado: 'RETIRADA',
        fechaUltimaActividad: new Date(),
      })
      .where('id = :idMembresia', {
        idMembresia,
      })
      .andWhere('id_proyecto = :idProyecto', {
        idProyecto,
      })
      .andWhere('estado = :estado', {
        estado: 'ACTIVA',
      })
      .execute();

    return resultado.affected === 1;
  }

  async permisoActivoExiste(idPermiso: string): Promise<boolean> {
    const filas = await this.dataSource.query<
      Array<{
        existe: boolean;
      }>
    >(
      `
          SELECT EXISTS (
            SELECT 1
            FROM permiso
            WHERE
              id = $1
              AND estado = 'ACTIVO'
          ) AS existe
        `,
      [idPermiso],
    );

    return Boolean(filas[0]?.existe);
  }

  async asignarPermisoParticular(
    idMembresia: string,
    idPermiso: string,
    tipoAsignacion: TipoAsignacionPermiso,
  ): Promise<void> {
    await this.dataSource.query(
      `
        INSERT INTO permiso_membresia (
          tipo_asignacion,
          estado,
          fecha_asignacion,
          id_membresia,
          id_permiso
        )
        VALUES (
          $1,
          'ACTIVO',
          CURRENT_TIMESTAMP,
          $2,
          $3
        )
        ON CONFLICT (
          id_membresia,
          id_permiso
        )
        DO UPDATE SET
          tipo_asignacion =
            EXCLUDED.tipo_asignacion,
          estado = 'ACTIVO',
          fecha_asignacion =
            CURRENT_TIMESTAMP
      `,
      [tipoAsignacion, idMembresia, idPermiso],
    );
  }

  async listarPermisosEfectivos(
    idMembresia: string,
  ): Promise<PermisoEfectivoParticipante[]> {
    return this.dataSource.query<PermisoEfectivoParticipante[]>(
      `
        SELECT
          p.id AS "idPermiso",
          p.nombre AS "nombre",
          p.recurso AS "recurso",
          p.accion AS "accion",

          CASE
            WHEN pm.tipo_asignacion = 'DENEGAR'
              AND pm.estado = 'ACTIVO'
              THEN FALSE

            WHEN pm.tipo_asignacion = 'CONCEDER'
              AND pm.estado = 'ACTIVO'
              THEN TRUE

            WHEN rp.id IS NOT NULL
              THEN TRUE

            ELSE FALSE
          END AS "permitido",

          CASE
            WHEN pm.tipo_asignacion = 'DENEGAR'
              AND pm.estado = 'ACTIVO'
              THEN 'DENEGAR'

            WHEN pm.tipo_asignacion = 'CONCEDER'
              AND pm.estado = 'ACTIVO'
              THEN 'CONCEDER'

            WHEN rp.id IS NOT NULL
              THEN 'ROL'

            ELSE 'NINGUNO'
          END AS "fuente"

        FROM membresia m

        CROSS JOIN permiso p

        LEFT JOIN rol_permiso rp
          ON rp.id_rol = m.id_rol
          AND rp.id_permiso = p.id

        LEFT JOIN permiso_membresia pm
          ON pm.id_membresia = m.id
          AND pm.id_permiso = p.id

        WHERE
          m.id = $1
          AND m.estado = 'ACTIVA'
          AND p.estado = 'ACTIVO'

        ORDER BY
          p.recurso ASC,
          p.accion ASC
      `,
      [idMembresia],
    );
  }
}
