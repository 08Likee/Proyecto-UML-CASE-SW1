export interface ConversacionIa {
  id: string;
  titulo: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: 'ACTIVA' | 'ARCHIVADA' | 'ELIMINADA';
  estadoAnterior?: 'ACTIVA' | 'ARCHIVADA' | null;
  fechaEliminacion?: Date | null;
  fechaPurga?: Date | null;
  idEliminador?: string | null;
  idProyecto: string;
  idCreador: string;
}

export interface MensajeIa {
  id: string;
  contenido: string;
  tipoEmisor: 'USUARIO' | 'IA';
  fechaCreacion: Date;
  identificadorSolicitud: string;
  idConversacion: string;
  idUsuario: string | null;
}
