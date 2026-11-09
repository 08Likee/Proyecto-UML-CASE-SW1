import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CrearModeloUmlUseCase } from '../../application/use-cases/cu05-modelar-diagrama-clases/crear-modelo-uml.use-case';
import { GuardarModeloUmlUseCase } from '../../application/use-cases/cu05-modelar-diagrama-clases/guardar-modelo-uml.use-case';
import { ListarModelosUmlUseCase } from '../../application/use-cases/cu05-modelar-diagrama-clases/listar-modelos-uml.use-case';
import { ObtenerModeloUmlUseCase } from '../../application/use-cases/cu05-modelar-diagrama-clases/obtener-modelo-uml.use-case';
import { ModeloUmlInvalidoError } from '../../domain/errors/modelo-uml-invalido.error';
import { ModeloUmlNoEncontradoError } from '../../domain/errors/modelo-uml-no-encontrado.error';
import { ModeloUmlVersionConflictivaError } from '../../domain/errors/modelo-uml-version-conflictiva.error';
import { CrearModeloUmlDto } from '../dto/crear-modelo-uml.dto';
import { GuardarModeloUmlDto } from '../dto/guardar-modelo-uml.dto';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../../../pa01-gestion-usuarios-proyectos-colaborativos/presentation/guards/access-token.guard';
import { PapeleraRecursosService } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/papelera-recursos.service';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';

@Controller('proyectos/:idProyecto/modelos-uml')
@UseGuards(AccessTokenGuard)
export class ModelosUmlController {
  constructor(
    private readonly crearModeloUmlUseCase: CrearModeloUmlUseCase,
    private readonly listarModelosUmlUseCase: ListarModelosUmlUseCase,
    private readonly obtenerModeloUmlUseCase: ObtenerModeloUmlUseCase,
    private readonly guardarModeloUmlUseCase: GuardarModeloUmlUseCase,
    private readonly papelera: PapeleraRecursosService,
  ) {}

  @Post()
  async crear(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CrearModeloUmlDto,
  ) {
    try {
      return await this.crearModeloUmlUseCase.execute({
        idUsuario: request.usuarioId!,
        idProyecto,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        contenido: dto.contenido,
      });
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  @Get()
  async listar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      return await this.listarModelosUmlUseCase.execute(
        request.usuarioId!,
        idProyecto,
      );
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  @Get('papelera')
  listarPapelera(@Param('idProyecto', new ParseUUIDPipe()) idProyecto: string, @Req() request: AuthenticatedRequest) {
    return this.papelera.listarModelos(request.usuarioId!, idProyecto);
  }

  @Delete(':idModelo')
  moverAPapelera(@Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string, @Req() request: AuthenticatedRequest) {
    return this.papelera.moverModelo(request.usuarioId!, idProyecto, idModelo).then(() => ({ok: true}));
  }

  @Post(':idModelo/restaurar')
  restaurar(@Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string, @Req() request: AuthenticatedRequest) {
    return this.papelera.restaurarModelo(request.usuarioId!, idProyecto, idModelo).then(() => ({ok: true}));
  }

  @Get(':idModelo')
  async obtener(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      return await this.obtenerModeloUmlUseCase.execute(
        request.usuarioId!,
        idProyecto,
        idModelo,
      );
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  @Put(':idModelo')
  async guardar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: GuardarModeloUmlDto,
  ) {
    try {
      return await this.guardarModeloUmlUseCase.execute({
        idUsuario: request.usuarioId!,
        idProyecto,
        idModelo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        contenido: dto.contenido,
        version: dto.version,
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

    if (error instanceof ModeloUmlVersionConflictivaError) {
      throw new ConflictException(error.message);
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
