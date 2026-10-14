import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../../../pa01-gestion-usuarios-proyectos-colaborativos/presentation/guards/access-token.guard';
import { ImportarModeloXmiUseCase } from '../../application/use-cases/cu07-importar-diagrama-enterprise-architect/importar-modelo-xmi.use-case';
import { ValidarImportacionXmiUseCase } from '../../application/use-cases/cu07-importar-diagrama-enterprise-architect/validar-importacion-xmi.use-case';
import { ModeloNoImportableXmiError } from '../../domain/errors/modelo-no-importable-xmi.error';
import { TAMANO_MAXIMO_XMI_BYTES } from '../../domain/services/analizar-importacion-xmi-enterprise-architect';

interface ArchivoSubido {
  buffer: Buffer;
  originalname?: string;
}

@Controller('proyectos/:idProyecto/modelos-uml/importacion-xmi')
@UseGuards(AccessTokenGuard)
export class ImportacionXmiController {
  constructor(
    private readonly validarUseCase: ValidarImportacionXmiUseCase,
    private readonly importarUseCase: ImportarModeloXmiUseCase,
  ) {}

  @Post('validacion')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_XMI_BYTES } }))
  async validar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    try {
      return await this.validarUseCase.execute(
        request.usuarioId!,
        idProyecto,
        this.exigirArchivo(archivo),
      );
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_XMI_BYTES } }))
  async importar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() archivo?: ArchivoSubido,
    @Body('nombre') nombre?: string,
  ) {
    try {
      return await this.importarUseCase.execute({
        idUsuario: request.usuarioId!,
        idProyecto,
        archivo: this.exigirArchivo(archivo),
        nombre,
      });
    } catch (error: unknown) {
      this.traducirError(error);
    }
  }

  private exigirArchivo(archivo?: ArchivoSubido): Buffer {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('Selecciona un archivo XMI para continuar');
    }
    return archivo.buffer;
  }

  private traducirError(error: unknown): never {
    if (error instanceof OperacionProyectoNoAutorizadaError) {
      throw new ForbiddenException(error.message);
    }
    if (error instanceof ModeloNoImportableXmiError) {
      throw new BadRequestException({
        message: error.message,
        ...error.resultado,
      });
    }
    throw error;
  }
}
