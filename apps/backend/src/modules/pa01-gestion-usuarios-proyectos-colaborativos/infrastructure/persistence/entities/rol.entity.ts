import { Check, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'rol' })
@Unique('uq_rol_proyecto_nombre', ['idProyecto', 'nombre'])
@Unique('uq_rol_id_proyecto', ['id', 'idProyecto'])
@Check('chk_rol_estado', `"estado" IN ('ACTIVO', 'INACTIVO')`)
export class RolEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nombre!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  descripcion!: string | null;

  @Column({
    name: 'es_predeterminado',
    type: 'boolean',
    default: false,
  })
  esPredeterminado!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ACTIVO',
  })
  estado!: string;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @Column({
    name: 'fecha_actualizacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion!: Date;

  @Column({
    name: 'id_proyecto',
    type: 'uuid',
  })
  idProyecto!: string;
}
