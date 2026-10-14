import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearPermisoExportacionXmi1790840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permiso (nombre, descripcion, recurso, accion, estado)
      VALUES (
        'Exportar modelo XMI',
        'Permite exportar modelos UML a XMI compatible con Enterprise Architect',
        'MODELO',
        'EXPORTAR',
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
        AND p.accion = 'EXPORTAR'
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
        AND p.recurso = 'MODELO'
        AND p.accion = 'EXPORTAR'
    `);

    await queryRunner.query(`
      DELETE FROM permiso
      WHERE recurso = 'MODELO'
        AND accion = 'EXPORTAR'
    `);
  }
}
