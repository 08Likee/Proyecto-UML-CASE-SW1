import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearRolesPredeterminados1790680000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
     * CU-03 exige roles predefinidos además de roles personalizados.
     * Se crean por proyecto porque el diseño establece que cada rol
     * pertenece exclusivamente a un proyecto.
     */
    await queryRunner.query(`
      INSERT INTO rol (
        nombre,
        descripcion,
        es_predeterminado,
        id_proyecto
      )
      SELECT
        'Editor',
        'Rol predeterminado para editar modelos sin administrar el proyecto',
        TRUE,
        p.id
      FROM proyecto p
      ON CONFLICT (id_proyecto, nombre)
      DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO rol (
        nombre,
        descripcion,
        es_predeterminado,
        id_proyecto
      )
      SELECT
        'Espectador',
        'Rol predeterminado de consulta sin permisos de edición',
        TRUE,
        p.id
      FROM proyecto p
      ON CONFLICT (id_proyecto, nombre)
      DO NOTHING
    `);

    /*
     * Editor puede consultar el proyecto y su estructura colaborativa,
     * además de consultar y editar modelos UML. No recibe permisos de
     * administración de proyecto, participantes ni roles.
     */
    await queryRunner.query(`
      INSERT INTO rol_permiso (
        id_rol,
        id_permiso
      )
      SELECT
        r.id,
        p.id
      FROM rol r
      INNER JOIN permiso p
        ON (
          (p.recurso = 'PROYECTO' AND p.accion = 'CONSULTAR')
          OR (p.recurso = 'PARTICIPANTE' AND p.accion = 'CONSULTAR')
          OR (p.recurso = 'ROL' AND p.accion = 'CONSULTAR')
          OR (p.recurso = 'MODELO' AND p.accion IN ('CONSULTAR', 'EDITAR'))
        )
      WHERE
        r.nombre = 'Editor'
        AND r.es_predeterminado = TRUE
        AND p.estado = 'ACTIVO'
      ON CONFLICT (id_rol, id_permiso)
      DO NOTHING
    `);

    /*
     * Espectador conserva únicamente permisos de consulta.
     */
    await queryRunner.query(`
      INSERT INTO rol_permiso (
        id_rol,
        id_permiso
      )
      SELECT
        r.id,
        p.id
      FROM rol r
      INNER JOIN permiso p
        ON (
          (p.recurso = 'PROYECTO' AND p.accion = 'CONSULTAR')
          OR (p.recurso = 'PARTICIPANTE' AND p.accion = 'CONSULTAR')
          OR (p.recurso = 'ROL' AND p.accion = 'CONSULTAR')
          OR (p.recurso = 'MODELO' AND p.accion = 'CONSULTAR')
        )
      WHERE
        r.nombre = 'Espectador'
        AND r.es_predeterminado = TRUE
        AND p.estado = 'ACTIVO'
      ON CONFLICT (id_rol, id_permiso)
      DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /*
     * Evitamos eliminar roles que ya estén siendo utilizados por una
     * membresía o invitación. Los roles sin referencias sí pueden
     * retirarse de forma segura al revertir la migración.
     */
    await queryRunner.query(`
      DELETE FROM rol_permiso rp
      USING rol r
      WHERE
        rp.id_rol = r.id
        AND r.es_predeterminado = TRUE
        AND r.nombre IN ('Editor', 'Espectador')
        AND NOT EXISTS (
          SELECT 1
          FROM membresia m
          WHERE m.id_rol = r.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM invitacion i
          WHERE i.id_rol = r.id
        )
    `);

    await queryRunner.query(`
      DELETE FROM rol r
      WHERE
        r.es_predeterminado = TRUE
        AND r.nombre IN ('Editor', 'Espectador')
        AND NOT EXISTS (
          SELECT 1
          FROM membresia m
          WHERE m.id_rol = r.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM invitacion i
          WHERE i.id_rol = r.id
        )
    `);
  }
}
