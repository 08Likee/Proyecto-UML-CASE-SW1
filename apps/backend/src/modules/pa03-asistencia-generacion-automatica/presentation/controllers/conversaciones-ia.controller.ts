import {
  Body,
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../../../pa01-gestion-usuarios-proyectos-colaborativos/presentation/guards/access-token.guard';
import { Cu12ConversacionesIaService } from '../../application/services/cu12-conversaciones-ia.service';
import { Cu09ConsultarIaEnConversacionService } from '../../application/services/cu09-consultar-ia-en-conversacion.service';
import { Cu09TranscribirVozService } from '../../application/services/cu09-transcribir-voz.service';
import { LIMITE_BYTES_AUDIO_VOZ } from '../../domain/services/validar-audio-voz';
import { Cu13AnalizarModeloUmlService } from '../../application/services/cu13-analizar-modelo-uml.service';
import { Cu13ProponerCambiosUmlService } from '../../application/services/cu13-proponer-cambios-uml.service';
import {
  CrearConversacionIaDto,
  EnviarMensajeIaDto,
  ConsultarIaConContextoDto,
} from '../dto/cu12-conversacion.dto';

@Controller('proyectos/:idProyecto/conversaciones-ia')
@UseGuards(AccessTokenGuard)
export class ConversacionesIaController {
  constructor(
    private readonly service: Cu12ConversacionesIaService,
    private readonly consultasIa: Cu09ConsultarIaEnConversacionService,
    private readonly voz: Cu09TranscribirVozService,
    private readonly analisisModelo: Cu13AnalizarModeloUmlService,
    private readonly propuestasModelo: Cu13ProponerCambiosUmlService,
  ) {}

  @Post()
  crear(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CrearConversacionIaDto,
  ) {
    return this.service.crear(request.usuarioId!, idProyecto, dto.titulo);
  }

  @Get()
  listar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Req() request: AuthenticatedRequest,
    @Query('limite', new DefaultValuePipe(50), ParseIntPipe) limite: number,
    @Query('desplazamiento', new DefaultValuePipe(0), ParseIntPipe)
    desplazamiento: number,
  ) {
    return this.service.listar(
      request.usuarioId!,
      idProyecto,
      limite,
      desplazamiento,
    );
  }

  // La papelera es una vista separada, nunca aparece en la lista activa.
  @Get('papelera')
  listarPapelera(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Req() request: AuthenticatedRequest,
    @Query('limite', new DefaultValuePipe(50), ParseIntPipe) limite: number,
    @Query('desplazamiento', new DefaultValuePipe(0), ParseIntPipe) desplazamiento: number,
  ) {
    return this.service.listarPapelera(request.usuarioId!, idProyecto, limite, desplazamiento);
  }

  @Patch(':idConversacion/papelera')
  moverAPapelera(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.moverAPapelera(request.usuarioId!, idProyecto, idConversacion);
  }

  @Patch(':idConversacion/restaurar')
  restaurarPapelera(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.restaurarPapelera(request.usuarioId!, idProyecto, idConversacion);
  }

  @Get(':idConversacion')
  obtener(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.obtener(request.usuarioId!, idProyecto, idConversacion);
  }

  @Patch(':idConversacion/archivar')
  archivar(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.archivar(
      request.usuarioId!,
      idProyecto,
      idConversacion,
    );
  }

  @Post(':idConversacion/mensajes')
  enviarMensaje(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: EnviarMensajeIaDto,
  ) {
    return this.service.enviarMensaje(
      request.usuarioId!,
      idProyecto,
      idConversacion,
      dto.contenido,
    );
  }

  // CU-09 voz: solo devuelve texto editable. No crea mensajes ni ejecuta comandos.
  @Post(':idConversacion/transcripciones-audio')
  @UseInterceptors(FileInterceptor('audio', {
    limits: { fileSize: LIMITE_BYTES_AUDIO_VOZ, files: 1 },
  }))
  transcribirAudio(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() archivo?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!archivo) throw new BadRequestException('Adjuntá un audio válido.');
    return this.voz.transcribir(request.usuarioId!, idProyecto, idConversacion, archivo);
  }

  // Acción explícita de IA: enviar un mensaje normal NO invoca a GroqCloud.
  @Post(':idConversacion/consultas-ia')
  consultarIa(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConsultarIaConContextoDto,
  ) {
    return this.consultasIa.consultar(
      request.usuarioId!, idProyecto, idConversacion, dto.contenido,
      dto.idsConversacionesContexto ?? [],
    );
  }

  // CU-13: análisis de lectura del modelo autorizado, sin proponer aún operaciones aplicables.
  @Post(':idConversacion/modelos-uml/:idModelo/analisis-ia')
  analizarModelo(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: EnviarMensajeIaDto,
  ) {
    return this.analisisModelo.analizar(
      request.usuarioId!, idProyecto, idConversacion, idModelo, dto.contenido,
    );
  }

  // CU-13 bloque 8.1: únicamente propuestas revisables; no ejecuta cambios UML.
  @Post(':idConversacion/modelos-uml/:idModelo/propuestas-ia')
  proponerCambios(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: EnviarMensajeIaDto,
  ) {
    return this.propuestasModelo.generar(request.usuarioId!, idProyecto, idConversacion, idModelo, dto.contenido);
  }

  @Get(':idConversacion/modelos-uml/:idModelo/propuestas-ia')
  listarPropuestas(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.propuestasModelo.listar(request.usuarioId!, idProyecto, idConversacion, idModelo);
  }

  @Post(':idConversacion/modelos-uml/:idModelo/propuestas-ia/:idPropuesta/rechazar')
  rechazarPropuesta(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Param('idPropuesta', new ParseUUIDPipe()) idPropuesta: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.propuestasModelo.rechazar(request.usuarioId!, idProyecto, idConversacion, idModelo, idPropuesta);
  }

  // CU-13 bloque 8.2: confirmación humana, autorización y transacción atómica.
  @Post(':idConversacion/modelos-uml/:idModelo/propuestas-ia/:idPropuesta/aplicar')
  aplicarPropuesta(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Param('idModelo', new ParseUUIDPipe()) idModelo: string,
    @Param('idPropuesta', new ParseUUIDPipe()) idPropuesta: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.propuestasModelo.aplicar(request.usuarioId!, idProyecto, idConversacion, idModelo, idPropuesta);
  }

  @Get(':idConversacion/mensajes')
  listarMensajes(
    @Param('idProyecto', new ParseUUIDPipe()) idProyecto: string,
    @Param('idConversacion', new ParseUUIDPipe()) idConversacion: string,
    @Req() request: AuthenticatedRequest,
    @Query('limite', new DefaultValuePipe(50), ParseIntPipe) limite: number,
    @Query('desplazamiento', new DefaultValuePipe(0), ParseIntPipe)
    desplazamiento: number,
  ) {
    return this.service.listarMensajes(
      request.usuarioId!,
      idProyecto,
      idConversacion,
      limite,
      desplazamiento,
    );
  }
}
