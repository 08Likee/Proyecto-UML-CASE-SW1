import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearProyectoRolMembresia1790440000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE proyecto (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
        fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT chk_proyecto_estado
          CHECK (
            estado IN (
              'ACTIVO',
              'INACTIVO',
              'ARCHIVADO'
            )
          ),

        CONSTRAINT chk_proyecto_configuracion
          CHECK (
            jsonb_typeof(configuracion) = 'object'
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE rol (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        es_predeterminado BOOLEAN NOT NULL DEFAULT FALSE,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_proyecto UUID NOT NULL,

        CONSTRAINT fk_rol_proyecto
          FOREIGN KEY (id_proyecto)
          REFERENCES proyecto(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT uq_rol_proyecto_nombre
          UNIQUE (id_proyecto, nombre),

        CONSTRAINT uq_rol_id_proyecto
          UNIQUE (id, id_proyecto),

        CONSTRAINT chk_rol_estado
          CHECK (
            estado IN (
              'ACTIVO',
              'INACTIVO'
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE membresia (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fecha_union TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
        fecha_ultima_actividad TIMESTAMPTZ,
        id_usuario UUID NOT NULL,
        id_proyecto UUID NOT NULL,
        id_rol UUID NOT NULL,

        CONSTRAINT fk_membresia_usuario
          FOREIGN KEY (id_usuario)
          REFERENCES usuario(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT fk_membresia_proyecto
          FOREIGN KEY (id_proyecto)
          REFERENCES proyecto(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT fk_membresia_rol_proyecto
          FOREIGN KEY (id_rol, id_proyecto)
          REFERENCES rol(id, id_proyecto)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT uq_membresia_usuario_proyecto
          UNIQUE (id_usuario, id_proyecto),

        CONSTRAINT chk_membresia_estado
          CHECK (
            estado IN (
              'ACTIVA',
              'INACTIVA',
              'RETIRADA'
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_membresia_proyecto
      ON membresia(id_proyecto)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_membresia_rol
      ON membresia(id_rol)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS membresia
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS rol
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS proyecto
    `);
  }
}
