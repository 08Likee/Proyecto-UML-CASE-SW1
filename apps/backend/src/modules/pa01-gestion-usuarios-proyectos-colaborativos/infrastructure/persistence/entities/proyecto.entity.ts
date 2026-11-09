import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'proyecto' })
@Check('chk_proyecto_estado', `"estado" IN ('ACTIVO', 'INACTIVO', 'ARCHIVADO', 'ELIMINADO')`)
export class ProyectoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  nombre!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  descripcion!: string | null;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ACTIVO',
  })
  estado!: string;

  @Column({
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  configuracion!: Record<string, unknown>;

  @Column({
    name: 'fecha_actualizacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion!: Date;

  @Column({ name: 'estado_anterior', type: 'varchar', length: 20, nullable: true })
  estadoAnterior!: string | null;

  @Column({ name: 'fecha_eliminacion', type: 'timestamptz', nullable: true })
  fechaEliminacion!: Date | null;

  @Column({ name: 'fecha_purga', type: 'timestamptz', nullable: true })
  fechaPurga!: Date | null;

  @Column({ name: 'eliminado_por', type: 'uuid', nullable: true })
  eliminadoPor!: string | null;
}
