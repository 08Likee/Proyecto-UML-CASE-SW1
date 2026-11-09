import { BadRequestException, ForbiddenException, GatewayTimeoutException, Injectable, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorProveedorIa } from '../../infrastructure/ia/error-proveedor-ia';
import { Cu12ConversacionesIaService } from './cu12-conversaciones-ia.service';
import { TranscriptorAudioPort, type ArchivoAudioVoz } from '../ports/transcriptor-audio.port';
import { validarAudioVoz, validarTextoTranscrito } from '../../domain/services/validar-audio-voz';

/** Transcribir no envía mensajes, no consulta IA y nunca ejecuta cambios UML. */
@Injectable()
export class Cu09TranscribirVozService {
  constructor(
    private readonly conversaciones: Cu12ConversacionesIaService,
    private readonly transcriptor: TranscriptorAudioPort,
  ) {}

  async transcribir(idUsuario: string, idProyecto: string, idConversacion: string, archivo: ArchivoAudioVoz | undefined) {
    const valido = validarAudioVoz(archivo);
    const conversacion = await this.conversaciones.obtener(idUsuario, idProyecto, idConversacion);
    if (conversacion.estado !== 'ACTIVA') throw new ForbiddenException('La conversación está archivada.');

    let resultado;
    try {
      resultado = await this.transcriptor.transcribir({ ...archivo!, mimetype: valido.mime });
    } catch (error: unknown) {
      if (!(error instanceof ErrorProveedorIa)) throw error;
      switch (error.codigo) {
        case 'SOLICITUD_INVALIDA':
          throw new BadRequestException('El proveedor no pudo procesar el formato de audio.');
        case 'CUOTA_AGOTADA':
          throw new HttpException('Se alcanzó el límite de transcripciones. Reintentá más tarde.', HttpStatus.TOO_MANY_REQUESTS);
        case 'TIEMPO_AGOTADO':
          throw new GatewayTimeoutException('La transcripción tardó demasiado. Podés escribir el mensaje.');
        default:
          throw new ServiceUnavailableException('El servicio de transcripción no está disponible. Podés escribir el mensaje.');
      }
    }

    // Al volver de un proveedor externo el permiso puede haber sido revocado.
    const vigente = await this.conversaciones.obtener(idUsuario, idProyecto, idConversacion);
    if (vigente.estado !== 'ACTIVA') throw new ForbiddenException('La conversación está archivada.');
    return { texto: validarTextoTranscrito(resultado.texto) };
  }
}
