import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AutorizacionProyectoService } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import { ConversacionesIaRepository } from '../ports/conversaciones-ia.repository';

@Injectable()
export class Cu12ConversacionesIaService {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,
    private readonly repository: ConversacionesIaRepository,
  ) {}

  private async exigirAcceso(
    idUsuario: string,
    idProyecto: string,
    accion: 'CONSULTAR' | 'MODIFICAR' = 'CONSULTAR',
  ): Promise<void> {
    try {
      await this.autorizacion.exigirPermiso(
        idUsuario,
        idProyecto,
        'PROYECTO',
        accion,
      );
    } catch (error: unknown) {
      if (error instanceof OperacionProyectoNoAutorizadaError) {
        throw new ForbiddenException(
          'No tiene acceso autorizado a las conversaciones de este proyecto',
        );
      }
      throw error;
    }
  }

  private async exigirAnfitrion(idUsuario: string, idProyecto: string): Promise<void> {
    // También se aplica el permiso efectivo, para respetar DENEGAR.
    await this.exigirAcceso(idUsuario, idProyecto, 'MODIFICAR');
    if (!(await this.repository.esAnfitrion(idProyecto, idUsuario))) {
      throw new ForbiddenException('Solo el Anfitrión del proyecto puede gestionar la papelera');
    }
  }

  async listarPapelera(idUsuario: string, idProyecto: string, limite = 50, desplazamiento = 0) {
    this.pagina(limite, desplazamiento);
    await this.exigirAnfitrion(idUsuario, idProyecto);
    return this.repository.listarPapelera(idProyecto, idUsuario, limite, desplazamiento);
  }

  async moverAPapelera(idUsuario: string, idProyecto: string, idConversacion: string) {
    await this.exigirAnfitrion(idUsuario, idProyecto);
    const resultado = await this.repository.moverAPapelera(idProyecto, idUsuario, idConversacion);
    if (!resultado) throw new NotFoundException('Conversación no disponible para eliminar');
    return resultado;
  }

  async restaurarPapelera(idUsuario: string, idProyecto: string, idConversacion: string) {
    await this.exigirAnfitrion(idUsuario, idProyecto);
    const resultado = await this.repository.restaurarPapelera(idProyecto, idUsuario, idConversacion);
    if (!resultado) throw new NotFoundException('Conversación no disponible para restaurar o plazo vencido');
    return resultado;
  }

  private pagina(limite: number, desplazamiento: number): void {
    if (
      !Number.isInteger(limite) ||
      limite < 1 ||
      limite > 100 ||
      !Number.isSafeInteger(desplazamiento) ||
      desplazamiento < 0
    ) {
      throw new BadRequestException(
        'Paginación inválida (limite: 1 a 100, desplazamiento: entero no negativo)',
      );
    }
  }

  async crear(idUsuario: string, idProyecto: string, titulo: string) {
    await this.exigirAcceso(idUsuario, idProyecto);
    const limpio = titulo.trim();
    if (!limpio || limpio.length > 200) {
      throw new BadRequestException(
        'El título debe contener entre 1 y 200 caracteres',
      );
    }
    const conversacion = await this.repository.crear(
      idProyecto,
      idUsuario,
      limpio,
    );
    if (!conversacion) throw new NotFoundException('Proyecto no disponible');
    return conversacion;
  }

  async listar(
    idUsuario: string,
    idProyecto: string,
    limite = 50,
    desplazamiento = 0,
  ) {
    this.pagina(limite, desplazamiento);
    await this.exigirAcceso(idUsuario, idProyecto);
    return this.repository.listar(
      idProyecto,
      idUsuario,
      limite,
      desplazamiento,
    );
  }

  async obtener(idUsuario: string, idProyecto: string, idConversacion: string) {
    await this.exigirAcceso(idUsuario, idProyecto);
    const conversacion = await this.repository.obtener(
      idProyecto,
      idUsuario,
      idConversacion,
    );
    if (!conversacion)
      throw new NotFoundException(
        'Conversación no encontrada en el proyecto activo',
      );
    return conversacion;
  }

  async archivar(
    idUsuario: string,
    idProyecto: string,
    idConversacion: string,
  ) {
    await this.exigirAcceso(idUsuario, idProyecto, 'MODIFICAR');
    const conversacion = await this.repository.archivar(
      idProyecto,
      idUsuario,
      idConversacion,
    );
    if (!conversacion)
      throw new NotFoundException(
        'Conversación activa no encontrada en el proyecto',
      );
    return conversacion;
  }

  async enviarMensaje(
    idUsuario: string,
    idProyecto: string,
    idConversacion: string,
    contenido: string,
  ) {
    await this.exigirAcceso(idUsuario, idProyecto);
    const limpio = contenido.trim();
    if (!limpio || limpio.length > 8000) {
      throw new BadRequestException(
        'El mensaje debe contener entre 1 y 8000 caracteres',
      );
    }
    // Identificador generado por el servidor: una petición humana distinta, un identificador distinto.
    const identificadorSolicitud = randomUUID();
    const mensaje = await this.repository.enviarMensajeUsuario(
      idProyecto,
      idConversacion,
      idUsuario,
      limpio,
      identificadorSolicitud,
    );
    if (!mensaje)
      throw new NotFoundException(
        'Conversación activa no encontrada en el proyecto',
      );
    return mensaje;
  }

  async guardarRespuestaIa(
    idUsuario: string,
    idProyecto: string,
    idConversacion: string,
    identificadorSolicitud: string,
    contenido: string,
  ) {
    // Revalidar autorización después de esperar a GroqCloud: una membresía
    // puede haber sido retirada mientras se generaba la respuesta.
    await this.exigirAcceso(idUsuario, idProyecto);
    const guardada = await this.repository.registrarRespuestaIa(
      idProyecto,
      idConversacion,
      idUsuario,
      identificadorSolicitud,
      contenido,
    );
    if (!guardada) {
      throw new NotFoundException(
        'No se puede guardar la respuesta en una conversación activa de este proyecto',
      );
    }
    return guardada;
  }

  async listarMensajes(
    idUsuario: string,
    idProyecto: string,
    idConversacion: string,
    limite = 50,
    desplazamiento = 0,
  ) {
    this.pagina(limite, desplazamiento);
    await this.exigirAcceso(idUsuario, idProyecto);
    const mensajes = await this.repository.listarMensajes(
      idProyecto,
      idUsuario,
      idConversacion,
      limite,
      desplazamiento,
    );
    if (mensajes === null)
      throw new NotFoundException(
        'Conversación no encontrada en el proyecto activo',
      );
    return mensajes;
  }
}
