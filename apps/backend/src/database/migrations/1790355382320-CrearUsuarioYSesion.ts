import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearUsuarioYSesion1790355382320 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto
    `);

    await queryRunner.query(`
      CREATE TABLE usuario (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        correo VARCHAR(254) NOT NULL,
        contrasena_hash VARCHAR(255) NOT NULL,
        foto_perfil TEXT,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ultima_conexion TIMESTAMPTZ,
        CONSTRAINT chk_usuario_estado
          CHECK (
            estado IN (
              'ACTIVO',
              'INACTIVO',
              'BLOQUEADO'
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_usuario_correo
      ON usuario (LOWER(correo))
    `);

    await queryRunner.query(`
      CREATE TABLE sesion (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        refresh_token_hash VARCHAR(255) NOT NULL,
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion TIMESTAMPTZ NOT NULL,
        fecha_revocacion TIMESTAMPTZ,
        dispositivo VARCHAR(255),
        id_usuario UUID NOT NULL,

        CONSTRAINT uq_sesion_refresh_token_hash
          UNIQUE (refresh_token_hash),

        CONSTRAINT fk_sesion_usuario
          FOREIGN KEY (id_usuario)
          REFERENCES usuario(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,

        CONSTRAINT chk_sesion_expiracion
          CHECK (
            fecha_expiracion > fecha_creacion
          ),

        CONSTRAINT chk_sesion_revocacion
          CHECK (
            fecha_revocacion IS NULL
            OR fecha_revocacion >= fecha_creacion
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sesion_usuario_expiracion
      ON sesion(id_usuario, fecha_expiracion)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS sesion
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS usuario
    `);
  }
}
