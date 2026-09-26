import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmarRecuperacionDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  nuevaContrasena!: string;

  @IsString()
  @IsNotEmpty()
  confirmacionContrasena!: string;
}
