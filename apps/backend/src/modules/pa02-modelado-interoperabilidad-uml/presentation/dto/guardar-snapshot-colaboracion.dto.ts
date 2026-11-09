import { IsInt, Min, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class GuardarSnapshotColaboracionDto {
  @IsObject()
  contenido!: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  estadoYjsBase64!: string;

  @IsInt()
  @Min(1)
  versionEsperada!: number;
}
