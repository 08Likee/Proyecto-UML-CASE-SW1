import { MigrationInterface, QueryRunner } from 'typeorm';

/** CU-13 Bloque 8.1: propuestas revisables, sin ejecución ni modificación del UML. */
export class CrearPropuestasUmlIa1791100000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE propuesta_uml_ia (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_proyecto UUID NOT NULL REFERENCES proyecto(id) ON DELETE RESTRICT,
        id_modelo UUID NOT NULL REFERENCES modelo_uml(id) ON DELETE RESTRICT,
        id_conversacion UUID NOT NULL REFERENCES conversacion_ia(id) ON DELETE RESTRICT,
        id_creador UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
        id_mensaje_usuario UUID NOT NULL REFERENCES mensaje_ia(id) ON DELETE RESTRICT,
        version_modelo INTEGER NOT NULL CHECK (version_modelo >= 1),
        estado VARCHAR(16) NOT NULL DEFAULT 'PENDIENTE'
          CHECK (estado IN ('PENDIENTE', 'RECHAZADA', 'APLICADA')),
        datos JSONB NOT NULL CHECK (jsonb_typeof(datos) = 'object'),
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_propuesta_uml_mensaje UNIQUE (id_conversacion, id_mensaje_usuario)
      )
    `);
    await q.query(`CREATE INDEX idx_propuesta_uml_modelo_conversacion
      ON propuesta_uml_ia(id_proyecto, id_modelo, id_conversacion, fecha_creacion DESC)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS propuesta_uml_ia');
  }
}
