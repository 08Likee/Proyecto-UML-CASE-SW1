import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'rol_permiso' })
@Unique('uq_rol_permiso', ['idRol', 'idPermiso'])
@Index('idx_rol_permiso_permiso', ['idPermiso'])
export class RolPermisoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'fecha_asignacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaAsignacion!: Date;

  @Column({
    name: 'id_rol',
    type: 'uuid',
  })
  idRol!: string;

  @Column({
    name: 'id_permiso',
    type: 'uuid',
  })
  idPermiso!: string;
}
