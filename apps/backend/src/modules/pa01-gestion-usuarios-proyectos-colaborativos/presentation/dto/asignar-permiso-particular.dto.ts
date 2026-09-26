import { IsIn } from 'class-validator';

export class AsignarPermisoParticularDto {
  @IsIn(['CONCEDER', 'DENEGAR'])
  tipoAsignacion!: 'CONCEDER' | 'DENEGAR';
}
