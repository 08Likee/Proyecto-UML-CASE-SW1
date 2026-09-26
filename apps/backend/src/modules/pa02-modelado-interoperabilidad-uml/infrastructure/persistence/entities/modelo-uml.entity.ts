import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { type ModeloUmlContenido } from '../../../domain/models/modelo-uml';

@Entity({ name: 'modelo_uml' })
@Check('chk_modelo_uml_version', '"version" >= 1')
@Check('chk_modelo_uml_estado', `"estado" IN ('ACTIVO', 'ARCHIVADO')`)
@Check('chk_modelo_uml_contenido', `jsonb_typeof("contenido") = 'object'`)
export class ModeloUmlEntity {
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
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  contenido!: ModeloUmlContenido;

  @Column({
    type: 'integer',
    default: 1,
  })
  version!: number;

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
