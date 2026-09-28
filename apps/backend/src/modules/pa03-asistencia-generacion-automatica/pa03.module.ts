import { Module } from '@nestjs/common';
import { Pa01Module } from '../pa01-gestion-usuarios-proyectos-colaborativos/pa01.module';
import { Pa02Module } from '../pa02-modelado-interoperabilidad-uml/pa02.module';
import { ArchivoZipService } from './application/ports/archivo-zip.service';
import { GenerarBackendUseCase } from './application/use-cases/cu10-generar-backend/generar-backend.use-case';
import { ValidarGeneracionBackendUseCase } from './application/use-cases/cu10-generar-backend/validar-generacion-backend.use-case';
import { ZipNativoService } from './infrastructure/archive/zip-nativo.service';
import { GeneracionBackendController } from './presentation/controllers/generacion-backend.controller';

@Module({
  imports: [Pa01Module, Pa02Module],
  controllers: [GeneracionBackendController],
  providers: [
    {
      provide: ArchivoZipService,
      useClass: ZipNativoService,
    },
    ValidarGeneracionBackendUseCase,
    GenerarBackendUseCase,
  ],
})
export class Pa03Module {}
