import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AsignarPermisoParticularUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/asignar-permiso-particular.use-case';
import { CambiarRolParticipanteUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/cambiar-rol-participante.use-case';
import { CrearRolPersonalizadoUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/crear-rol-personalizado.use-case';
import { InvitarParticipanteUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/invitar-participante.use-case';
import { ListarParticipantesUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/listar-participantes.use-case';
import { ListarPermisosUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/listar-permisos.use-case';
import { ListarRolesUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/listar-roles.use-case';
import { ObtenerPermisosParticipanteUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/obtener-permisos-participante.use-case';
import { RetirarParticipanteUseCase } from '../../application/use-cases/cu03-gestionar-participantes-roles/retirar-participante.use-case';

import { OperacionProyectoNoAutorizadaError } from '../../domain/errors/operacion-proyecto-no-autorizada.error';

import { AsignarPermisoParticularDto } from '../dto/asignar-permiso-particular.dto';
import { CambiarRolParticipanteDto } from '../dto/cambiar-rol-participante.dto';
import { CrearRolDto } from '../dto/crear-rol.dto';
import { InvitarParticipanteDto } from '../dto/invitar-participante.dto';

import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../guards/access-token.guard';

@Controller('proyectos/:idProyecto')
@UseGuards(AccessTokenGuard)
export class ParticipantesRolesController {
  constructor(
    private readonly listarRolesUseCase: ListarRolesUseCase,

    private readonly listarPermisosUseCase: ListarPermisosUseCase,

    private readonly crearRolUseCase: CrearRolPersonalizadoUseCase,

    private readonly listarParticipantesUseCase: ListarParticipantesUseCase,

    private readonly invitarParticipanteUseCase: InvitarParticipanteUseCase,

    private readonly cambiarRolParticipanteUseCase: CambiarRolParticipanteUseCase,

    private readonly retirarParticipanteUseCase: RetirarParticipanteUseCase,

    private readonly obtenerPermisosParticipanteUseCase: ObtenerPermisosParticipanteUseCase,

    private readonly asignarPermisoParticularUseCase: AsignarPermisoParticularUseCase,
  ) {}

  @Get('roles')
  listarRoles(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.listarRolesUseCase.execute(request.usuarioId!, idProyecto),
    );
  }

  @Get('permisos')
  listarPermisos(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.listarPermisosUseCase.execute(request.usuarioId!, idProyecto),
    );
  }

  @Post('roles')
  crearRol(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CrearRolDto,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.crearRolUseCase.execute({
        idUsuario: request.usuarioId!,
        idProyecto,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        permisosIds: dto.permisosIds,
      }),
    );
  }

  @Get('participantes')
  listarParticipantes(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.listarParticipantesUseCase.execute(request.usuarioId!, idProyecto),
    );
  }

  @Post('invitaciones')
  invitarParticipante(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: InvitarParticipanteDto,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.invitarParticipanteUseCase.execute({
        idUsuarioAnfitrion: request.usuarioId!,
        idProyecto,
        correo: dto.correo,
        idRol: dto.idRol,
      }),
    );
  }

  @Put('participantes/:idMembresia/rol')
  cambiarRolParticipante(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Param('idMembresia', new ParseUUIDPipe())
    idMembresia: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CambiarRolParticipanteDto,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.cambiarRolParticipanteUseCase.execute({
        idUsuarioAnfitrion: request.usuarioId!,
        idProyecto,
        idMembresia,
        idRol: dto.idRol,
      }),
    );
  }

  @Delete('participantes/:idMembresia')
  @HttpCode(HttpStatus.NO_CONTENT)
  async retirarParticipante(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Param('idMembresia', new ParseUUIDPipe())
    idMembresia: string,

    @Req()
    request: AuthenticatedRequest,
  ): Promise<void> {
    await this.ejecutarConAutorizacion(() =>
      this.retirarParticipanteUseCase.execute(
        request.usuarioId!,
        idProyecto,
        idMembresia,
      ),
    );
  }

  @Get('participantes/:idMembresia/permisos')
  obtenerPermisosParticipante(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Param('idMembresia', new ParseUUIDPipe())
    idMembresia: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.obtenerPermisosParticipanteUseCase.execute(
        request.usuarioId!,
        idProyecto,
        idMembresia,
      ),
    );
  }

  @Put('participantes/:idMembresia/permisos/:idPermiso')
  asignarPermisoParticular(
    @Param('idProyecto', new ParseUUIDPipe())
    idProyecto: string,

    @Param('idMembresia', new ParseUUIDPipe())
    idMembresia: string,

    @Param('idPermiso', new ParseUUIDPipe())
    idPermiso: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: AsignarPermisoParticularDto,
  ) {
    return this.ejecutarConAutorizacion(() =>
      this.asignarPermisoParticularUseCase.execute({
        idUsuarioAnfitrion: request.usuarioId!,
        idProyecto,
        idMembresia,
        idPermiso,
        tipoAsignacion: dto.tipoAsignacion,
      }),
    );
  }

  private async ejecutarConAutorizacion<T>(
    operacion: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operacion();
    } catch (error: unknown) {
      if (error instanceof OperacionProyectoNoAutorizadaError) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }
}
