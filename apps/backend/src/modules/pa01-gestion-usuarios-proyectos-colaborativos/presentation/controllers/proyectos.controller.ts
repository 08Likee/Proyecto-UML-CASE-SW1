import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { CrearProyectoUseCase } from '../../application/use-cases/cu02-gestionar-proyecto-colaborativo/crear-proyecto.use-case';
import { CrearProyectoDto } from '../dto/crear-proyecto.dto';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../guards/access-token.guard';

import { ListarProyectosUseCase } from '../../application/use-cases/cu02-gestionar-proyecto-colaborativo/listar-proyectos.use-case';
import { ModificarProyectoUseCase } from '../../application/use-cases/cu02-gestionar-proyecto-colaborativo/modificar-proyecto.use-case';
import { ObtenerProyectoUseCase } from '../../application/use-cases/cu02-gestionar-proyecto-colaborativo/obtener-proyecto.use-case';
import { OperacionProyectoNoAutorizadaError } from '../../domain/errors/operacion-proyecto-no-autorizada.error';
import { ProyectoNoEncontradoError } from '../../domain/errors/proyecto-no-encontrado.error';
import { ModificarProyectoDto } from '../dto/modificar-proyecto.dto';
import { PapeleraRecursosService } from '../../application/services/papelera-recursos.service';

@Controller('proyectos')
@UseGuards(AccessTokenGuard)
export class ProyectosController {
  constructor(
    private readonly crearProyectoUseCase: CrearProyectoUseCase,

    private readonly listarProyectosUseCase: ListarProyectosUseCase,

    private readonly obtenerProyectoUseCase: ObtenerProyectoUseCase,

    private readonly modificarProyectoUseCase: ModificarProyectoUseCase,
    private readonly papelera: PapeleraRecursosService,
  ) {}

  @Post()
  crear(
    @Req()
    request: AuthenticatedRequest,
    @Body()
    dto: CrearProyectoDto,
  ) {
    return this.crearProyectoUseCase.execute({
      idUsuario: request.usuarioId!,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      configuracion: dto.configuracion,
    });
  }

  @Get()
  listar(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.listarProyectosUseCase.execute(request.usuarioId!);
  }

  @Get('papelera')
  listarPapelera(@Req() request: AuthenticatedRequest) {
    return this.papelera.listarProyectos(request.usuarioId!);
  }

  @Delete(':id')
  moverAPapelera(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: AuthenticatedRequest) {
    return this.papelera.moverProyecto(request.usuarioId!, id).then(() => ({ ok: true }));
  }

  @Post(':id/restaurar')
  restaurar(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: AuthenticatedRequest) {
    return this.papelera.restaurarProyecto(request.usuarioId!, id).then(() => ({ ok: true }));
  }

  @Get(':id')
  async obtener(
    @Param('id', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    try {
      return await this.obtenerProyectoUseCase.execute(
        idProyecto,
        request.usuarioId!,
      );
    } catch (error: unknown) {
      if (error instanceof ProyectoNoEncontradoError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof OperacionProyectoNoAutorizadaError) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }

  @Put(':id')
  async modificar(
    @Param('id', new ParseUUIDPipe())
    idProyecto: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: ModificarProyectoDto,
  ) {
    try {
      return await this.modificarProyectoUseCase.execute({
        idProyecto,
        idUsuario: request.usuarioId!,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        configuracion: dto.configuracion,
      });
    } catch (error: unknown) {
      if (error instanceof ProyectoNoEncontradoError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof OperacionProyectoNoAutorizadaError) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }
}
