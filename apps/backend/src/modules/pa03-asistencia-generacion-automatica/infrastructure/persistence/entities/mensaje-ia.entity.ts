import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'mensaje_ia' })
@Check('chk_mensaje_ia_tipo_emisor', `"tipo_emisor" IN ('USUARIO', 'IA')`)
@Index('idx_mensaje_ia_conversacion_fecha', [
  'idConversacion',
  'fechaCreacion',
  'id',
])
export class MensajeIaEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'text' }) contenido!: string;
  @Column({ name: 'tipo_emisor', type: 'varchar', length: 20 }) tipoEmisor!:
    'USUARIO' | 'IA';
  @Column({
    name: 'fecha_creacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;
  @Column({ name: 'identificador_solicitud', type: 'uuid' })
  identificadorSolicitud!: string;
  @Column({ name: 'id_conversacion', type: 'uuid' }) idConversacion!: string;
  @Column({ name: 'id_usuario', type: 'uuid', nullable: true }) idUsuario!:
    string | null;
}
