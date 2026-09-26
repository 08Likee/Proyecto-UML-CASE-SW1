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

@Module({
  imports: [TypeOrmModule.forFeature([ModeloUmlEntity]), Pa01Module],
  controllers: [ModelosUmlController],
  providers: [
    {
      provide: ModeloUmlRepository,
      useClass: TypeOrmModeloUmlRepository,
    },
    CrearModeloUmlUseCase,
    ListarModelosUmlUseCase,
    ObtenerModeloUmlUseCase,
    GuardarModeloUmlUseCase,
  ],
})
export class Pa02Module {}
