import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../../../pa01-gestion-usuarios-proyectos-colaborativos/presentation/guards/access-token.guard';
import { ExportarModeloXmiUseCase } from '../../application/use-cases/cu08-exportar-diagrama-enterprise-architect/exportar-modelo-xmi.use-case';
import { ValidarExportacionXmiUseCase } from '../../application/use-cases/cu08-exportar-diagrama-enterprise-architect/validar-exportacion-xmi.use-case';
import { ModeloNoExportableXmiError } from '../../domain/errors/modelo-no-exportable-xmi.error';
import { ModeloUmlNoEncontradoError } from '../../domain/errors/modelo-uml-no-encontrado.error';

@Controller('proyectos/:idProyecto/modelos-uml/:idModelo/exportacion-xmi')
@UseGuards(AccessTokenGuard)
export class ExportacionXmiController {
  constructor(
    private readonly validarUseCase: ValidarExportacionXmiUseCase,
    private readonly exportarUseCase: ExportarModeloXmiUseCase,
  ) {}

  @Get('validacion')
  async validar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      return await this.validarUseCase.execute(
        request.usuarioId!,
        idProyecto,
        idModelo,
      );
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  @Get('archivo')
  async exportar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const resultado = await this.exportarUseCase.execute(
        request.usuarioId!,
        idProyecto,
        idModelo,
      );

      response.setHeader('Content-Type', 'application/xml; charset=utf-8');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${resultado.nombreArchivo}"`,
      );
      response.send(resultado.contenido);
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

    if (error instanceof ModeloNoExportableXmiError) {
      throw new BadRequestException({
        message: error.message,
        ...error.resultado,
      });
    }

    throw error;
  }
}
