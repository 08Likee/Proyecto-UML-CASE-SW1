import { MigrationInterface, QueryRunner } from 'typeorm';

// CU-12, ciclo #3. Sólo crea las tablas de conversaciones y mensajes; CU-13 llegará después.
export class CrearConversacionesIa1791000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE conversacion_ia (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        titulo VARCHAR(200) NOT NULL,
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
        id_proyecto UUID NOT NULL,
        id_creador UUID NOT NULL,
        CONSTRAINT fk_conversacion_ia_proyecto FOREIGN KEY (id_proyecto)
          REFERENCES proyecto(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_conversacion_ia_creador FOREIGN KEY (id_creador)
          REFERENCES usuario(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_conversacion_ia_estado CHECK (estado IN ('ACTIVA', 'ARCHIVADA')),
        CONSTRAINT chk_conversacion_ia_titulo CHECK (LENGTH(TRIM(titulo)) > 0),
        CONSTRAINT chk_conversacion_ia_fechas CHECK (fecha_actualizacion >= fecha_creacion)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_conversacion_ia_proyecto_fecha
      ON conversacion_ia (id_proyecto, fecha_actualizacion DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_conversacion_ia_creador ON conversacion_ia (id_creador)
    `);
    await queryRunner.query(`
      CREATE TABLE mensaje_ia (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contenido TEXT NOT NULL,
        tipo_emisor VARCHAR(20) NOT NULL,
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        identificador_solicitud UUID NOT NULL,
        id_conversacion UUID NOT NULL,
        id_usuario UUID,
        CONSTRAINT fk_mensaje_ia_conversacion FOREIGN KEY (id_conversacion)
          REFERENCES conversacion_ia(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_mensaje_ia_usuario FOREIGN KEY (id_usuario)
          REFERENCES usuario(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_mensaje_ia_tipo_emisor CHECK (tipo_emisor IN ('USUARIO', 'IA')),
        CONSTRAINT chk_mensaje_ia_autoria CHECK (
          (tipo_emisor = 'USUARIO' AND id_usuario IS NOT NULL)
          OR (tipo_emisor = 'IA' AND id_usuario IS NULL)
        ),
        CONSTRAINT chk_mensaje_ia_contenido CHECK (LENGTH(TRIM(contenido)) > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_mensaje_ia_conversacion_fecha
      ON mensaje_ia (id_conversacion, fecha_creacion, id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_mensaje_ia_solicitud
      ON mensaje_ia (id_conversacion, identificador_solicitud)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_mensaje_ia_usuario ON mensaje_ia (id_usuario) WHERE id_usuario IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS mensaje_ia');
    await queryRunner.query('DROP TABLE IF EXISTS conversacion_ia');
  }
}
