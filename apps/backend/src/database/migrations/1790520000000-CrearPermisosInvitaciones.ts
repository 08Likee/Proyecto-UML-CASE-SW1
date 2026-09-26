import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearPermisosInvitaciones1790520000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE permiso (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        recurso VARCHAR(100) NOT NULL,
        accion VARCHAR(50) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',

        CONSTRAINT uq_permiso_recurso_accion
          UNIQUE (recurso, accion),

        CONSTRAINT chk_permiso_estado
          CHECK (
            estado IN (
              'ACTIVO',
              'INACTIVO'
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE invitacion (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(255) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion TIMESTAMPTZ NOT NULL,
        fecha_aceptacion TIMESTAMPTZ,
        fecha_rechazo TIMESTAMPTZ,
        id_proyecto UUID NOT NULL,
        id_usuario UUID NOT NULL,
        id_rol UUID NOT NULL,

        CONSTRAINT uq_invitacion_token
          UNIQUE (token),

        CONSTRAINT fk_invitacion_proyecto
          FOREIGN KEY (id_proyecto)
          REFERENCES proyecto(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT fk_invitacion_usuario
          FOREIGN KEY (id_usuario)
          REFERENCES usuario(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT fk_invitacion_rol_proyecto
          FOREIGN KEY (id_rol, id_proyecto)
          REFERENCES rol(id, id_proyecto)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT chk_invitacion_estado
          CHECK (
            estado IN (
              'PENDIENTE',
              'ACEPTADA',
              'RECHAZADA',
              'EXPIRADA',
              'CANCELADA'
            )
          ),

        CONSTRAINT chk_invitacion_expiracion
          CHECK (
            fecha_expiracion > fecha_creacion
          ),

        CONSTRAINT chk_invitacion_fechas_respuesta
          CHECK (
            NOT (
              fecha_aceptacion IS NOT NULL
              AND fecha_rechazo IS NOT NULL
            )
          ),

        CONSTRAINT chk_invitacion_estado_respuesta
          CHECK (
            (
              estado = 'ACEPTADA'
              AND fecha_aceptacion IS NOT NULL
              AND fecha_rechazo IS NULL
            )
            OR
            (
              estado = 'RECHAZADA'
              AND fecha_rechazo IS NOT NULL
              AND fecha_aceptacion IS NULL
            )
            OR
            (
              estado IN (
                'PENDIENTE',
                'EXPIRADA',
                'CANCELADA'
              )
              AND fecha_aceptacion IS NULL
              AND fecha_rechazo IS NULL
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_invitacion_pendiente_usuario_proyecto
      ON invitacion(id_usuario, id_proyecto)
      WHERE estado = 'PENDIENTE'
    `);

    await queryRunner.query(`
      CREATE INDEX idx_invitacion_usuario_estado
      ON invitacion(id_usuario, estado)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_invitacion_proyecto
      ON invitacion(id_proyecto)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_invitacion_rol
      ON invitacion(id_rol)
    `);

    await queryRunner.query(`
      CREATE TABLE rol_permiso (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_rol UUID NOT NULL,
        id_permiso UUID NOT NULL,

        CONSTRAINT fk_rol_permiso_rol
          FOREIGN KEY (id_rol)
          REFERENCES rol(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,

        CONSTRAINT fk_rol_permiso_permiso
          FOREIGN KEY (id_permiso)
          REFERENCES permiso(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,

        CONSTRAINT uq_rol_permiso
          UNIQUE (id_rol, id_permiso)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_rol_permiso_permiso
      ON rol_permiso(id_permiso)
    `);

    await queryRunner.query(`
      CREATE TABLE permiso_membresia (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo_asignacion VARCHAR(20) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_membresia UUID NOT NULL,
        id_permiso UUID NOT NULL,

        CONSTRAINT fk_permiso_membresia_membresia
          FOREIGN KEY (id_membresia)
          REFERENCES membresia(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,

        CONSTRAINT fk_permiso_membresia_permiso
          FOREIGN KEY (id_permiso)
          REFERENCES permiso(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,

        CONSTRAINT uq_permiso_membresia
          UNIQUE (id_membresia, id_permiso),

        CONSTRAINT chk_permiso_membresia_tipo
          CHECK (
            tipo_asignacion IN (
              'CONCEDER',
              'DENEGAR'
            )
          ),

        CONSTRAINT chk_permiso_membresia_estado
          CHECK (
            estado IN (
              'ACTIVO',
              'INACTIVO'
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_permiso_membresia_permiso
      ON permiso_membresia(id_permiso)
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
          'Consultar proyecto',
          'Permite consultar la información general del proyecto',
          'PROYECTO',
          'CONSULTAR'
        ),
        (
          'Modificar proyecto',
          'Permite modificar la información general del proyecto',
          'PROYECTO',
          'MODIFICAR'
        ),
        (
          'Consultar participantes',
          'Permite consultar participantes y sus roles',
          'PARTICIPANTE',
          'CONSULTAR'
        ),
        (
          'Invitar participante',
          'Permite invitar usuarios al proyecto',
          'PARTICIPANTE',
          'INVITAR'
        ),
        (
          'Cambiar rol de participante',
          'Permite cambiar el rol de un participante',
          'PARTICIPANTE',
          'CAMBIAR_ROL'
        ),
        (
          'Retirar participante',
          'Permite retirar participantes del proyecto',
          'PARTICIPANTE',
          'RETIRAR'
        ),
        (
          'Asignar permisos particulares',
          'Permite configurar excepciones particulares de permisos',
          'PARTICIPANTE',
          'ASIGNAR_PERMISO'
        ),
        (
          'Consultar roles',
          'Permite consultar los roles disponibles',
          'ROL',
          'CONSULTAR'
        ),
        (
          'Crear rol',
          'Permite crear roles personalizados',
          'ROL',
          'CREAR'
        )
    `);

    /*
     * Los proyectos creados durante CU-02 ya poseen
     * un rol Anfitrión. Lo convertimos en un rol con
     * todos los permisos actuales.
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
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS permiso_membresia
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS rol_permiso
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS invitacion
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS permiso
    `);
  }
}
