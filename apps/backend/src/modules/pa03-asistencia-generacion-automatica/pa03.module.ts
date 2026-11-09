import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pa01Module } from '../pa01-gestion-usuarios-proyectos-colaborativos/pa01.module';
import { Pa02Module } from '../pa02-modelado-interoperabilidad-uml/pa02.module';
import { ArchivoZipService } from './application/ports/archivo-zip.service';
import { ConversacionesIaRepository } from './application/ports/conversaciones-ia.repository';
import { PurgaConversacionesRepository } from './application/ports/purga-conversaciones.repository';
import { Cu12PurgaConversacionesService } from './application/services/cu12-purga-conversaciones.service';
import { TypeOrmPurgaConversacionesRepository } from './infrastructure/persistence/repositories/typeorm-purga-conversaciones.repository';
import { Cu12ConversacionesIaService } from './application/services/cu12-conversaciones-ia.service';
import { Cu09ConsultarIaEnConversacionService } from './application/services/cu09-consultar-ia-en-conversacion.service';
import { Cu09TranscribirVozService } from './application/services/cu09-transcribir-voz.service';
import { TranscriptorAudioPort } from './application/ports/transcriptor-audio.port';
import { GroqTranscriptorAudio } from './infrastructure/ia/groq-transcriptor-audio';
import { Cu13AnalizarModeloUmlService } from './application/services/cu13-analizar-modelo-uml.service';
import { Cu13ProponerCambiosUmlService } from './application/services/cu13-proponer-cambios-uml.service';
import { PropuestasUmlIaRepository } from './application/ports/propuestas-uml-ia.repository';
import { TypeOrmPropuestasUmlIaRepository } from './infrastructure/persistence/repositories/typeorm-propuestas-uml-ia.repository';
import { ProveedorIaPort } from './application/ports/proveedor-ia.port';
import { GenerarBackendUseCase } from './application/use-cases/cu10-generar-backend/generar-backend.use-case';
import { ValidarGeneracionBackendUseCase } from './application/use-cases/cu10-generar-backend/validar-generacion-backend.use-case';
import { ZipNativoService } from './infrastructure/archive/zip-nativo.service';
import { GroqProveedorIa } from './infrastructure/ia/groq-proveedor-ia';
import { ConversacionIaEntity } from './infrastructure/persistence/entities/conversacion-ia.entity';
import { MensajeIaEntity } from './infrastructure/persistence/entities/mensaje-ia.entity';
import { TypeOrmConversacionesIaRepository } from './infrastructure/persistence/repositories/typeorm-conversaciones-ia.repository';
import { ConversacionesIaController } from './presentation/controllers/conversaciones-ia.controller';
import { GeneracionBackendController } from './presentation/controllers/generacion-backend.controller';

@Module({
  imports: [
    Pa01Module,
    Pa02Module,
    TypeOrmModule.forFeature([ConversacionIaEntity, MensajeIaEntity]),
  ],
  controllers: [GeneracionBackendController, ConversacionesIaController],
  providers: [
    {
      provide: ArchivoZipService,
      useClass: ZipNativoService,
    },
    {
      provide: ProveedorIaPort,
      useClass: GroqProveedorIa,
    },
    {
      provide: ConversacionesIaRepository,
      useClass: TypeOrmConversacionesIaRepository,
    },
    Cu12ConversacionesIaService,
    {
      provide: PurgaConversacionesRepository,
      useClass: TypeOrmPurgaConversacionesRepository,
    },
    Cu12PurgaConversacionesService,
    Cu09ConsultarIaEnConversacionService,
    Cu09TranscribirVozService,
    { provide: TranscriptorAudioPort, useClass: GroqTranscriptorAudio },
    Cu13AnalizarModeloUmlService,
    Cu13ProponerCambiosUmlService,
    { provide: PropuestasUmlIaRepository, useClass: TypeOrmPropuestasUmlIaRepository },
    ValidarGeneracionBackendUseCase,
    GenerarBackendUseCase,
  ],
})
export class Pa03Module {}
