import {
  Check,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SesionEntity } from './sesion.entity';

@Entity({ name: 'usuario' })
@Check('chk_usuario_estado', `"estado" IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO')`)
export class UsuarioEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nombre!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  apellido!: string;

  @Column({
    type: 'varchar',
    length: 254,
  })
  correo!: string;

  @Column({
    name: 'contrasena_hash',
    type: 'varchar',
    length: 255,
  })
  contrasenaHash!: string;

  @Column({
    name: 'foto_perfil',
    type: 'text',
    nullable: true,
  })
  fotoPerfil!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ACTIVO',
  })
  estado!: string;

  @Column({
    name: 'fecha_registro',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaRegistro!: Date;

  @Column({
    name: 'ultima_conexion',
    type: 'timestamptz',
    nullable: true,
  })
  ultimaConexion!: Date | null;

  @OneToMany(() => SesionEntity, (sesion) => sesion.usuario)
  sesiones!: SesionEntity[];
}
