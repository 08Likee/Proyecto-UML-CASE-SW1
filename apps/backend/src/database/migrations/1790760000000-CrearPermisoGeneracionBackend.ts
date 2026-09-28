import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearPermisoGeneracionBackend1790760000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permiso (nombre, descripcion, recurso, accion, estado)
      VALUES (
        'Generar backend',
        'Permite generar un backend Spring Boot a partir de un modelo UML',
        'GENERACION',
        'GENERAR',
        'ACTIVO'
      )
      ON CONFLICT (recurso, accion)
      DO UPDATE SET estado = 'ACTIVO'
    `);

    await queryRunner.query(`
      INSERT INTO rol_permiso (id_rol, id_permiso)
      SELECT r.id, p.id
      FROM rol r
      INNER JOIN permiso p
        ON p.recurso = 'GENERACION'
        AND p.accion = 'GENERAR'
        AND p.estado = 'ACTIVO'
      WHERE
        r.es_predeterminado = TRUE
        AND r.nombre IN ('Anfitrión', 'Editor')
      ON CONFLICT (id_rol, id_permiso)
      DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM rol_permiso rp
      USING permiso p
      WHERE rp.id_permiso = p.id
        AND p.recurso = 'GENERACION'
        AND p.accion = 'GENERAR'
    `);

    await queryRunner.query(`
      DELETE FROM permiso
      WHERE recurso = 'GENERACION'
        AND accion = 'GENERAR'
    `);
  }
}
