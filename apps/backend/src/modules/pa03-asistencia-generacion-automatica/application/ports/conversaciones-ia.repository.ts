import type {
  ConversacionIa,
  MensajeIa,
} from '../../domain/models/conversacion-ia';

// Todas las lecturas/escrituras reciben un idProyecto: nunca buscar por idConversacion aislado.
export abstract class ConversacionesIaRepository {
  abstract crear(
    idProyecto: string,
    idUsuario: string,
    titulo: string,
  ): Promise<ConversacionIa | null>;
  abstract listar(
    idProyecto: string,
    idUsuario: string,
    limite: number,
    desplazamiento: number,
  ): Promise<ConversacionIa[]>;
  abstract obtener(
    idProyecto: string,
    idUsuario: string,
    idConversacion: string,
  ): Promise<ConversacionIa | null>;
  // La única identidad autorizada para gestionar la papelera es el
  // Anfitrión predeterminado, con permiso efectivo PROYECTO/MODIFICAR.
  abstract esAnfitrion(idProyecto: string, idUsuario: string): Promise<boolean>;
  abstract listarPapelera(
    idProyecto: string, idUsuario: string, limite: number, desplazamiento: number,
  ): Promise<ConversacionIa[]>;
  abstract moverAPapelera(
    idProyecto: string, idUsuario: string, idConversacion: string,
  ): Promise<ConversacionIa | null>;
  abstract restaurarPapelera(
    idProyecto: string, idUsuario: string, idConversacion: string,
  ): Promise<ConversacionIa | null>;
  abstract archivar(
    idProyecto: string,
    idUsuario: string,
    idConversacion: string,
  ): Promise<ConversacionIa | null>;
  abstract enviarMensajeUsuario(
    idProyecto: string,
    idConversacion: string,
    idUsuario: string,
    contenido: string,
    identificadorSolicitud: string,
  ): Promise<MensajeIa | null>;
  // Sólo se registra una respuesta vinculada a un mensaje humano existente.
  // La implementación vuelve a comprobar proyecto, conversación activa y membresía.
  abstract registrarRespuestaIa(
    idProyecto: string,
    idConversacion: string,
    idUsuarioSolicitante: string,
    identificadorSolicitud: string,
    contenido: string,
  ): Promise<MensajeIa | null>;
  abstract listarMensajes(
    idProyecto: string,
    idUsuario: string,
    idConversacion: string,
    limite: number,
    desplazamiento: number,
  ): Promise<MensajeIa[] | null>;
}
