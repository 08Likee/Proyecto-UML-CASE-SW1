import { IsUUID } from 'class-validator';

export class CambiarRolParticipanteDto {
  @IsUUID('4')
  idRol!: string;
}
