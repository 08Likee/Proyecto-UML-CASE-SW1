import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'invitacion' })
@Index('idx_invitacion_usuario_estado', ['idUsuario', 'estado'])
@Index('idx_invitacion_proyecto', ['idProyecto'])
@Index('idx_invitacion_rol', ['idRol'])
export class InvitacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  token!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDIENTE',
  })
  estado!: string;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @Column({
    name: 'fecha_expiracion',
    type: 'timestamptz',
  })
  fechaExpiracion!: Date;

  @Column({
    name: 'fecha_aceptacion',
    type: 'timestamptz',
    nullable: true,
  })
  fechaAceptacion!: Date | null;

  @Column({
    name: 'fecha_rechazo',
    type: 'timestamptz',
    nullable: true,
  })
  fechaRechazo!: Date | null;

  @Column({
    name: 'id_proyecto',
    type: 'uuid',
  })
  idProyecto!: string;

  @Column({
    name: 'id_usuario',
    type: 'uuid',
  })
  idUsuario!: string;

  @Column({
    name: 'id_rol',
    type: 'uuid',
  })
  idRol!: string;
}
