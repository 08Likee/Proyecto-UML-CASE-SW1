import { Transform } from 'class-transformer';

import { IsEmail, IsUUID } from 'class-validator';

export class InvitarParticipanteDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  correo!: string;

  @IsUUID('4')
  idRol!: string;
}
