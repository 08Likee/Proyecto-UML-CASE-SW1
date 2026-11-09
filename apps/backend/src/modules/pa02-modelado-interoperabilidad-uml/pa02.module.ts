import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pa01Module } from '../pa01-gestion-usuarios-proyectos-colaborativos/pa01.module';
import { CrearModeloUmlUseCase } from './application/use-cases/cu05-modelar-diagrama-clases/crear-modelo-uml.use-case';
import { GuardarModeloUmlUseCase } from './application/use-cases/cu05-modelar-diagrama-clases/guardar-modelo-uml.use-case';
import { ListarModelosUmlUseCase } from './application/use-cases/cu05-modelar-diagrama-clases/listar-modelos-uml.use-case';
import { ObtenerModeloUmlUseCase } from './application/use-cases/cu05-modelar-diagrama-clases/obtener-modelo-uml.use-case';
import { ModeloUmlRepository } from './domain/repositories/modelo-uml.repository';
import { ModeloUmlEntity } from './infrastructure/persistence/entities/modelo-uml.entity';
import { TypeOrmModeloUmlRepository } from './infrastructure/persistence/repositories/typeorm-modelo-uml.repository';
import { ModelosUmlController } from './presentation/controllers/modelos-uml.controller';
import { ObtenerAccesoColaboracionUseCase } from './application/use-cases/cu06-editar-diagrama-colaborativamente/obtener-acceso-colaboracion.use-case';
import { GuardarSnapshotColaboracionUseCase } from './application/use-cases/cu06-editar-diagrama-colaborativamente/guardar-snapshot-colaboracion.use-case';
import { ObtenerSnapshotColaboracionUseCase } from './application/use-cases/cu06-editar-diagrama-colaborativamente/obtener-snapshot-colaboracion.use-case';
import { ColaboracionUmlController } from './presentation/controllers/colaboracion-uml.controller';
import { CollaborationInternalGuard } from './presentation/guards/collaboration-internal.guard';
import { ValidarExportacionXmiUseCase } from './application/use-cases/cu08-exportar-diagrama-enterprise-architect/validar-exportacion-xmi.use-case';
import { ExportarModeloXmiUseCase } from './application/use-cases/cu08-exportar-diagrama-enterprise-architect/exportar-modelo-xmi.use-case';
import { ExportacionXmiController } from './presentation/controllers/exportacion-xmi.controller';
import { ValidarImportacionXmiUseCase } from './application/use-cases/cu07-importar-diagrama-enterprise-architect/validar-importacion-xmi.use-case';
import { ImportarModeloXmiUseCase } from './application/use-cases/cu07-importar-diagrama-enterprise-architect/importar-modelo-xmi.use-case';
import { ImportacionXmiController } from './presentation/controllers/importacion-xmi.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ModeloUmlEntity]), Pa01Module],
  controllers: [
    ModelosUmlController,
    ColaboracionUmlController,
    ExportacionXmiController,
    ImportacionXmiController,
  ],
  providers: [
    {
      provide: ModeloUmlRepository,
      useClass: TypeOrmModeloUmlRepository,
    },
    CrearModeloUmlUseCase,
    ListarModelosUmlUseCase,
    ObtenerModeloUmlUseCase,
    GuardarModeloUmlUseCase,
    ObtenerAccesoColaboracionUseCase,
    ObtenerSnapshotColaboracionUseCase,
    GuardarSnapshotColaboracionUseCase,
    CollaborationInternalGuard,
    ValidarExportacionXmiUseCase,
    ExportarModeloXmiUseCase,
    ValidarImportacionXmiUseCase,
    ImportarModeloXmiUseCase,
  ],
  exports: [ModeloUmlRepository, ObtenerModeloUmlUseCase],
})
export class Pa02Module {}
