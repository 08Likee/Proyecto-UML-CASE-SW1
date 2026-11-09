import { MigrationInterface, QueryRunner } from 'typeorm';

export class PapeleraModelosYProyectos1791280000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tabla of ['proyecto', 'modelo_uml']) {
      await queryRunner.query(`ALTER TABLE ${tabla} ADD COLUMN estado_anterior VARCHAR(20)`);
      await queryRunner.query(`ALTER TABLE ${tabla} ADD COLUMN fecha_eliminacion TIMESTAMPTZ`);
      await queryRunner.query(`ALTER TABLE ${tabla} ADD COLUMN fecha_purga TIMESTAMPTZ`);
      await queryRunner.query(`ALTER TABLE ${tabla} ADD COLUMN eliminado_por UUID`);
      await queryRunner.query(`CREATE INDEX idx_${tabla}_papelera ON ${tabla}(fecha_purga) WHERE estado = 'ELIMINADO'`);
    }
    await queryRunner.query(`ALTER TABLE proyecto DROP CONSTRAINT chk_proyecto_estado`);
    await queryRunner.query(`ALTER TABLE proyecto ADD CONSTRAINT chk_proyecto_estado CHECK (estado IN ('ACTIVO', 'INACTIVO', 'ARCHIVADO', 'ELIMINADO'))`);
    await queryRunner.query(`ALTER TABLE modelo_uml DROP CONSTRAINT chk_modelo_uml_estado`);
    await queryRunner.query(`ALTER TABLE modelo_uml ADD CONSTRAINT chk_modelo_uml_estado CHECK (estado IN ('ACTIVO', 'ARCHIVADO', 'ELIMINADO'))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE modelo_uml DROP CONSTRAINT chk_modelo_uml_estado`);
    await queryRunner.query(`ALTER TABLE modelo_uml ADD CONSTRAINT chk_modelo_uml_estado CHECK (estado IN ('ACTIVO', 'ARCHIVADO'))`);
    await queryRunner.query(`ALTER TABLE proyecto DROP CONSTRAINT chk_proyecto_estado`);
    await queryRunner.query(`ALTER TABLE proyecto ADD CONSTRAINT chk_proyecto_estado CHECK (estado IN ('ACTIVO', 'INACTIVO', 'ARCHIVADO'))`);
    for (const tabla of ['modelo_uml', 'proyecto']) {
      await queryRunner.query(`DROP INDEX IF EXISTS idx_${tabla}_papelera`);
      await queryRunner.query(`ALTER TABLE ${tabla} DROP COLUMN eliminado_por`);
      await queryRunner.query(`ALTER TABLE ${tabla} DROP COLUMN fecha_purga`);
      await queryRunner.query(`ALTER TABLE ${tabla} DROP COLUMN fecha_eliminacion`);
      await queryRunner.query(`ALTER TABLE ${tabla} DROP COLUMN estado_anterior`);
    }
  }
}
