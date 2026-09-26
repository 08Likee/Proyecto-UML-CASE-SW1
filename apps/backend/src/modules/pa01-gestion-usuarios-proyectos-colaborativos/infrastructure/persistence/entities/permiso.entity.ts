import { Check, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'permiso' })
@Unique('uq_permiso_recurso_accion', ['recurso', 'accion'])
@Check('chk_permiso_estado', `"estado" IN ('ACTIVO', 'INACTIVO')`)
export class PermisoEntity {
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
    type: 'varchar',
    length: 100,
  })
  recurso!: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  accion!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ACTIVO',
  })
  estado!: string;
}
