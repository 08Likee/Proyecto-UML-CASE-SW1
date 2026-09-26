import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SolicitarRecuperacionDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  correo!: string;
}
