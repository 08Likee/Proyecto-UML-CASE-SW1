import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ObtenerAccesoColaboracionUseCase } from '../../application/use-cases/cu06-editar-diagrama-colaborativamente/obtener-acceso-colaboracion.use-case';
import { GuardarSnapshotColaboracionUseCase } from '../../application/use-cases/cu06-editar-diagrama-colaborativamente/guardar-snapshot-colaboracion.use-case';
import { ObtenerSnapshotColaboracionUseCase } from '../../application/use-cases/cu06-editar-diagrama-colaborativamente/obtener-snapshot-colaboracion.use-case';
import { ModeloUmlInvalidoError } from '../../domain/errors/modelo-uml-invalido.error';
import { ModeloUmlNoEncontradoError } from '../../domain/errors/modelo-uml-no-encontrado.error';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../../../pa01-gestion-usuarios-proyectos-colaborativos/presentation/guards/access-token.guard';
import { GuardarSnapshotColaboracionDto } from '../dto/guardar-snapshot-colaboracion.dto';
import { CollaborationInternalGuard } from '../guards/collaboration-internal.guard';

@Controller()
export class ColaboracionUmlController {
  constructor(
    private readonly obtenerAccesoUseCase: ObtenerAccesoColaboracionUseCase,
    private readonly obtenerSnapshotUseCase: ObtenerSnapshotColaboracionUseCase,
    private readonly guardarSnapshotUseCase: GuardarSnapshotColaboracionUseCase,
  ) {}

  @Get(
    'proyectos/:idProyecto/modelos-uml/:idModelo/colaboracion/acceso',
  )
  @UseGuards(AccessTokenGuard)
  async obtenerAcceso(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      return await this.obtenerAccesoUseCase.execute(
        request.usuarioId!,
        idProyecto,
        idModelo,
      );
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  @Get(
    'colaboracion/interna/proyectos/:idProyecto/modelos-uml/:idModelo/snapshot',
  )
  @UseGuards(CollaborationInternalGuard)
  async obtenerSnapshot(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
  ) {
    try {
      return await this.obtenerSnapshotUseCase.execute(idProyecto, idModelo);
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  @Put(
    'colaboracion/interna/proyectos/:idProyecto/modelos-uml/:idModelo/snapshot',
  )
  @UseGuards(CollaborationInternalGuard)
  async guardarSnapshot(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Body() dto: GuardarSnapshotColaboracionDto,
  ) {
    try {
      return await this.guardarSnapshotUseCase.execute({
        idProyecto,
        idModelo,
        contenido: dto.contenido,
        estadoYjsBase64: dto.estadoYjsBase64,
      });
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  private traducirError(error: unknown): never {
    if (error instanceof OperacionProyectoNoAutorizadaError) {
      throw new ForbiddenException(error.message);
    }

    if (error instanceof ModeloUmlNoEncontradoError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof ModeloUmlInvalidoError) {
      throw new BadRequestException({
        message: error.message,
        campo: error.campo,
      });
    }

    throw error;
  }
}
