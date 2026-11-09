import { ArrayMaxSize, ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CrearConversacionIaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  titulo!: string;
}

export class EnviarMensajeIaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(8000)
  contenido!: string;
}

// RF-46: el participante indica explícitamente qué otras conversaciones consultar.
export class ConsultarIaConContextoDto extends EnviarMensajeIaDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  idsConversacionesContexto?: string[];
}
