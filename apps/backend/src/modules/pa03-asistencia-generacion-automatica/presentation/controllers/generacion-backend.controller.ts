import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
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
import { GenerarBackendUseCase } from '../../application/use-cases/cu10-generar-backend/generar-backend.use-case';
import { ValidarGeneracionBackendUseCase } from '../../application/use-cases/cu10-generar-backend/validar-generacion-backend.use-case';
import { ModeloGeneracionNoEncontradoError } from '../../domain/errors/modelo-generacion-no-encontrado.error';
import { ModeloNoGenerableError } from '../../domain/errors/modelo-no-generable.error';

@Controller('proyectos/:idProyecto/modelos-uml/:idModelo/generacion')
@UseGuards(AccessTokenGuard)
export class GeneracionBackendController {
  constructor(
    private readonly validarUseCase: ValidarGeneracionBackendUseCase,
    private readonly generarUseCase: GenerarBackendUseCase,
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

  @Post('backend')
  async generar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const resultado = await this.generarUseCase.execute(
        request.usuarioId!,
        idProyecto,
        idModelo,
      );
      response.setHeader('Content-Type', 'application/zip');
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
    if (error instanceof ModeloGeneracionNoEncontradoError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof ModeloNoGenerableError) {
      throw new BadRequestException({
        message: error.message,
        ...error.resultado,
      });
    }
    throw error;
  }
}
