import { MigrationInterface, QueryRunner } from 'typeorm';

/** CU-12 Bloque 12.2.1: eliminación lógica reversible durante treinta días. */
export class PapeleraConversacionesIa1791200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE conversacion_ia DROP CONSTRAINT chk_conversacion_ia_estado`);
    await q.query(`ALTER TABLE conversacion_ia
      ADD COLUMN estado_anterior VARCHAR(20),
      ADD COLUMN fecha_eliminacion TIMESTAMPTZ,
      ADD COLUMN fecha_purga TIMESTAMPTZ,
      ADD COLUMN id_eliminador UUID REFERENCES usuario(id) ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE conversacion_ia
      ADD CONSTRAINT chk_conversacion_ia_estado
      CHECK (estado IN ('ACTIVA', 'ARCHIVADA', 'ELIMINADA'))`);
    await q.query(`ALTER TABLE conversacion_ia
      ADD CONSTRAINT chk_conversacion_ia_papelera
      CHECK (
        (estado = 'ELIMINADA'
          AND estado_anterior IN ('ACTIVA', 'ARCHIVADA')
          AND fecha_eliminacion IS NOT NULL AND fecha_purga IS NOT NULL
          AND fecha_purga = fecha_eliminacion + INTERVAL '30 days'
          AND id_eliminador IS NOT NULL)
        OR
        (estado <> 'ELIMINADA' AND estado_anterior IS NULL
          AND fecha_eliminacion IS NULL AND fecha_purga IS NULL
          AND id_eliminador IS NULL)
      )`);
    await q.query(`CREATE INDEX idx_conversacion_ia_papelera
      ON conversacion_ia (fecha_purga)
      WHERE estado = 'ELIMINADA'`);
  }

  async down(q: QueryRunner): Promise<void> {
    // Revertir la migración devuelve chats de la papelera a su estado previo;
    // nunca destruye mensajes ni propuestas durante el rollback.
    await q.query(`ALTER TABLE conversacion_ia DROP CONSTRAINT chk_conversacion_ia_papelera`);
    await q.query(`UPDATE conversacion_ia
      SET estado = COALESCE(estado_anterior, 'ARCHIVADA')
      WHERE estado = 'ELIMINADA'`);
    await q.query(`DROP INDEX IF EXISTS idx_conversacion_ia_papelera`);
    await q.query(`ALTER TABLE conversacion_ia DROP COLUMN id_eliminador,
      DROP COLUMN fecha_purga, DROP COLUMN fecha_eliminacion,
      DROP COLUMN estado_anterior`);
    await q.query(`ALTER TABLE conversacion_ia DROP CONSTRAINT chk_conversacion_ia_estado`);
    await q.query(`ALTER TABLE conversacion_ia ADD CONSTRAINT chk_conversacion_ia_estado
      CHECK (estado IN ('ACTIVA', 'ARCHIVADA'))`);
  }
}
