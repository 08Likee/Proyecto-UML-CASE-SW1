import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccederProyectoUseCase } from '../../application/use-cases/cu04-acceder-proyecto-colaborativo/acceder-proyecto.use-case';
import { AceptarInvitacionUseCase } from '../../application/use-cases/cu04-acceder-proyecto-colaborativo/aceptar-invitacion.use-case';
import { ListarInvitacionesUseCase } from '../../application/use-cases/cu04-acceder-proyecto-colaborativo/listar-invitaciones.use-case';
import { RechazarInvitacionUseCase } from '../../application/use-cases/cu04-acceder-proyecto-colaborativo/rechazar-invitacion.use-case';

import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../guards/access-token.guard';

@Controller()
@UseGuards(AccessTokenGuard)
export class AccesoProyectoController {
  constructor(
    private readonly listarInvitacionesUseCase: ListarInvitacionesUseCase,

    private readonly aceptarInvitacionUseCase: AceptarInvitacionUseCase,

    private readonly rechazarInvitacionUseCase: RechazarInvitacionUseCase,

    private readonly accederProyectoUseCase: AccederProyectoUseCase,
  ) {}

  @Get('invitaciones')
  listarInvitaciones(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.listarInvitacionesUseCase.execute(request.usuarioId!);
  }

  @Post('invitaciones/:idInvitacion/aceptar')
  aceptarInvitacion(
    @Param('idInvitacion', new ParseUUIDPipe())
    idInvitacion: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.aceptarInvitacionUseCase.execute(
      request.usuarioId!,
      idInvitacion,
    );
  }

  @Post('invitaciones/:idInvitacion/rechazar')
  rechazarInvitacion(
    @Param('idInvitacion', new ParseUUIDPipe())
    idInvitacion: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.rechazarInvitacionUseCase.execute(
      request.usuarioId!,
      idInvitacion,
    );
  }

  @Get('proyectos/:idProyecto/acceso')
  accederProyecto(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.accederProyectoUseCase.execute(request.usuarioId!, idProyecto);
  }
}
