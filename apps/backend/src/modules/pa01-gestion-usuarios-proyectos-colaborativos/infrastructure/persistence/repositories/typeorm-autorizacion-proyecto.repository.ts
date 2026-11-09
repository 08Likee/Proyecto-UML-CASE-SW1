import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AutorizacionProyectoRepository } from '../../../domain/repositories/autorizacion-proyecto.repository';

@Injectable()
export class TypeOrmAutorizacionProyectoRepository implements AutorizacionProyectoRepository {
  constructor(private readonly dataSource: DataSource) {}

  async tienePermiso(
    idUsuario: string,
    idProyecto: string,
    recurso: string,
    accion: string,
    permitirProyectoEliminado = false,
  ): Promise<boolean> {
    const resultado = await this.dataSource.query<
      Array<{
        permitido: boolean;
      }>
    >(
      `
          SELECT
            CASE
              WHEN pm_denegar.id IS NOT NULL
                THEN FALSE

              WHEN pm_conceder.id IS NOT NULL
                THEN TRUE

              WHEN rp.id IS NOT NULL
                THEN TRUE

              ELSE FALSE
            END AS permitido

          FROM membresia m
          INNER JOIN proyecto pr ON pr.id = m.id_proyecto

          INNER JOIN permiso p
            ON p.recurso = $3
            AND p.accion = $4
            AND p.estado = 'ACTIVO'

          LEFT JOIN rol_permiso rp
            ON rp.id_rol = m.id_rol
            AND rp.id_permiso = p.id

          LEFT JOIN permiso_membresia pm_conceder
            ON pm_conceder.id_membresia = m.id
            AND pm_conceder.id_permiso = p.id
            AND pm_conceder.tipo_asignacion = 'CONCEDER'
            AND pm_conceder.estado = 'ACTIVO'

          LEFT JOIN permiso_membresia pm_denegar
            ON pm_denegar.id_membresia = m.id
            AND pm_denegar.id_permiso = p.id
            AND pm_denegar.tipo_asignacion = 'DENEGAR'
            AND pm_denegar.estado = 'ACTIVO'

          WHERE
            m.id_usuario = $1
            AND m.id_proyecto = $2
            AND m.estado = 'ACTIVA'
            ${permitirProyectoEliminado ? '' : "AND pr.estado <> 'ELIMINADO'"}

          LIMIT 1
        `,
      [idUsuario, idProyecto, recurso, accion],
    );

    return Boolean(resultado[0]?.permitido);
  }
}
