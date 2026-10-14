import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearPermisoImportacionXmi1790920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permiso (nombre, descripcion, recurso, accion, estado)
      VALUES (
        'Importar modelo XMI',
        'Permite importar modelos UML desde XMI proveniente de Enterprise Architect',
        'MODELO',
        'IMPORTAR',
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
        ON p.recurso = 'MODELO'
        AND p.accion = 'IMPORTAR'
        AND p.estado = 'ACTIVO'
      WHERE
        r.es_predeterminado = TRUE
        AND r.nombre IN ('Anfitrión', 'Editor')
      ON CONFLICT (id_rol, id_permiso)
      DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO rol_permiso (id_rol, id_permiso)
      SELECT r.id, p.id
      FROM rol r
      INNER JOIN permiso p
        ON p.recurso = 'MODELO'
        AND p.accion = 'EXPORTAR'
        AND p.estado = 'ACTIVO'
      WHERE
        r.es_predeterminado = TRUE
        AND r.nombre = 'Editor'
      ON CONFLICT (id_rol, id_permiso)
      DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM rol_permiso rp
      USING permiso p
      WHERE rp.id_permiso = p.id
        AND p.recurso = 'MODELO'
        AND p.accion = 'IMPORTAR'
    `);

    await queryRunner.query(`
      DELETE FROM permiso
      WHERE recurso = 'MODELO'
        AND accion = 'IMPORTAR'
    `);
  }
}
