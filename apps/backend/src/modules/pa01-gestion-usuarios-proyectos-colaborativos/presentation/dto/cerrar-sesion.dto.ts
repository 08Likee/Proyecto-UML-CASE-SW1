import { IsNotEmpty, IsString } from 'class-validator';

export class CerrarSesionDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
