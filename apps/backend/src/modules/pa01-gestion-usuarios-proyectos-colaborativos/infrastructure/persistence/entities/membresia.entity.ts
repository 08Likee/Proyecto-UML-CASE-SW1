import {
  Check,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'membresia' })
@Unique('uq_membresia_usuario_proyecto', ['idUsuario', 'idProyecto'])
@Index('idx_membresia_proyecto', ['idProyecto'])
@Index('idx_membresia_rol', ['idRol'])
@Check('chk_membresia_estado', `"estado" IN ('ACTIVA', 'INACTIVA', 'RETIRADA')`)
export class MembresiaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'fecha_union',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaUnion!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ACTIVA',
  })
  estado!: string;

  @Column({
    name: 'fecha_ultima_actividad',
    type: 'timestamptz',
    nullable: true,
  })
  fechaUltimaActividad!: Date | null;

  @Column({
    name: 'id_usuario',
    type: 'uuid',
  })
  idUsuario!: string;

  @Column({
    name: 'id_proyecto',
    type: 'uuid',
  })
  idProyecto!: string;

  @Column({
    name: 'id_rol',
    type: 'uuid',
  })
  idRol!: string;
}
