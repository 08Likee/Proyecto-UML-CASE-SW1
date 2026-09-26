import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearModeloUml1790600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE modelo_uml (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT,
        contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
        version INTEGER NOT NULL DEFAULT 1,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_proyecto UUID NOT NULL,

        CONSTRAINT fk_modelo_uml_proyecto
          FOREIGN KEY (id_proyecto)
          REFERENCES proyecto(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT chk_modelo_uml_version
          CHECK (version >= 1),

        CONSTRAINT chk_modelo_uml_estado
          CHECK (
            estado IN (
              'ACTIVO',
              'ARCHIVADO'
            )
          ),

        CONSTRAINT chk_modelo_uml_contenido
          CHECK (
            jsonb_typeof(contenido) = 'object'
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_modelo_uml_proyecto
      ON modelo_uml(id_proyecto)
    `);

    await queryRunner.query(`
      INSERT INTO permiso (
        nombre,
        descripcion,
        recurso,
        accion
      )
      VALUES
        (
          'Consultar modelo UML',
          'Permite visualizar y recuperar modelos UML del proyecto',
          'MODELO',
          'CONSULTAR'
        ),
        (
          'Editar modelo UML',
          'Permite crear y modificar modelos UML del proyecto',
          'MODELO',
          'EDITAR'
        )
      ON CONFLICT (recurso, accion)
      DO NOTHING
    `);

    /*
     * Todo Anfitrión predeterminado existente
     * recibe los nuevos permisos de modelado.
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
      CROSS JOIN permiso p
      WHERE
        r.nombre = 'Anfitrión'
        AND r.es_predeterminado = TRUE
        AND p.recurso = 'MODELO'
        AND p.accion IN (
          'CONSULTAR',
          'EDITAR'
        )
      ON CONFLICT (id_rol, id_permiso)
      DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS modelo_uml
    `);

    /*
     * Primero retiramos las asociaciones
     * para no violar las claves foráneas.
     */
    await queryRunner.query(`
      DELETE FROM rol_permiso
      WHERE id_permiso IN (
        SELECT id
        FROM permiso
        WHERE
          recurso = 'MODELO'
          AND accion IN (
            'CONSULTAR',
            'EDITAR'
          )
      )
    `);

    await queryRunner.query(`
      DELETE FROM permiso
      WHERE
        recurso = 'MODELO'
        AND accion IN (
          'CONSULTAR',
          'EDITAR'
        )
    `);
  }
}
