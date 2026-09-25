import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';

@Entity({ name: 'sesion' })
@Check('chk_sesion_expiracion', `"fecha_expiracion" > "fecha_creacion"`)
@Check(
  'chk_sesion_revocacion',
  `"fecha_revocacion" IS NULL OR "fecha_revocacion" >= "fecha_creacion"`,
)
export class SesionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  refreshTokenHash!: string;

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
    name: 'fecha_revocacion',
    type: 'timestamptz',
    nullable: true,
  })
  fechaRevocacion!: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  dispositivo!: string | null;

  @Column({
    name: 'id_usuario',
    type: 'uuid',
  })
  idUsuario!: string;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.sesiones, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'id_usuario',
    foreignKeyConstraintName: 'fk_sesion_usuario',
  })
  usuario!: UsuarioEntity;
}
