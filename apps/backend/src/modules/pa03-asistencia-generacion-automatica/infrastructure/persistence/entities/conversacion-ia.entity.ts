import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'conversacion_ia' })
@Check('chk_conversacion_ia_estado', `"estado" IN ('ACTIVA', 'ARCHIVADA', 'ELIMINADA')`)
@Index('idx_conversacion_ia_proyecto_fecha', [
  'idProyecto',
  'fechaActualizacion',
])
export class ConversacionIaEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) titulo!: string;
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
  @Column({ type: 'varchar', length: 20, default: 'ACTIVA' }) estado!:
    'ACTIVA' | 'ARCHIVADA' | 'ELIMINADA';
  @Column({ name: 'estado_anterior', type: 'varchar', length: 20, nullable: true })
  estadoAnterior!: 'ACTIVA' | 'ARCHIVADA' | null;
  @Column({ name: 'fecha_eliminacion', type: 'timestamptz', nullable: true })
  fechaEliminacion!: Date | null;
  @Column({ name: 'fecha_purga', type: 'timestamptz', nullable: true })
  fechaPurga!: Date | null;
  @Column({ name: 'id_eliminador', type: 'uuid', nullable: true })
  idEliminador!: string | null;
  @Column({ name: 'id_proyecto', type: 'uuid' }) idProyecto!: string;
  @Column({ name: 'id_creador', type: 'uuid' }) idCreador!: string;
}
