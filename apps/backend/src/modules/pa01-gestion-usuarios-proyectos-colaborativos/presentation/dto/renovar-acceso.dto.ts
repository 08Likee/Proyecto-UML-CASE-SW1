import { IsNotEmpty, IsString } from 'class-validator';

export class RenovarAccesoDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
