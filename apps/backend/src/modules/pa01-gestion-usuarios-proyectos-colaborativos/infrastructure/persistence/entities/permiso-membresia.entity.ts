import {
  Check,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({
  name: 'permiso_membresia',
})
@Unique('uq_permiso_membresia', ['idMembresia', 'idPermiso'])
@Index('idx_permiso_membresia_permiso', ['idPermiso'])
@Check(
  'chk_permiso_membresia_tipo',
  `"tipo_asignacion" IN ('CONCEDER', 'DENEGAR')`,
)
@Check('chk_permiso_membresia_estado', `"estado" IN ('ACTIVO', 'INACTIVO')`)
export class PermisoMembresiaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'tipo_asignacion',
    type: 'varchar',
    length: 20,
  })
  tipoAsignacion!: 'CONCEDER' | 'DENEGAR';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ACTIVO',
  })
  estado!: string;

  @Column({
    name: 'fecha_asignacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaAsignacion!: Date;

  @Column({
    name: 'id_membresia',
    type: 'uuid',
  })
  idMembresia!: string;

  @Column({
    name: 'id_permiso',
    type: 'uuid',
  })
  idPermiso!: string;
}
