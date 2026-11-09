import { apiRequest } from '../../../../shared/api/http';
import type { ConversacionIa, MensajeIa, ResultadoAnalisisModeloIa, ResultadoConsultaIa, ResultadoGenerarPropuestaUmlIa, ResultadoAplicacionUmlIa, PropuestaUmlIa } from '../types/conversaciones-ia.types';

const ruta = (idProyecto: string) =>
  `/proyectos/${encodeURIComponent(idProyecto)}/conversaciones-ia`;
const rutaMensajes = (idProyecto: string, idConversacion: string) =>
  `${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/mensajes`;

export function listarConversacionesIa(
  idProyecto: string,
  limite = 50,
  desplazamiento = 0,
): Promise<ConversacionIa[]> {
  return apiRequest<ConversacionIa[]>(
    `${ruta(idProyecto)}?limite=${limite}&desplazamiento=${desplazamiento}`,
  );
}

export function listarPapeleraConversacionesIa(idProyecto: string, limite = 50, desplazamiento = 0): Promise<ConversacionIa[]> {
  return apiRequest<ConversacionIa[]>(`${ruta(idProyecto)}/papelera?limite=${limite}&desplazamiento=${desplazamiento}`);
}

export function moverConversacionAPapelera(idProyecto: string, idConversacion: string): Promise<ConversacionIa> {
  return apiRequest<ConversacionIa>(`${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/papelera`, { method: 'PATCH' });
}

export function restaurarConversacionIa(idProyecto: string, idConversacion: string): Promise<ConversacionIa> {
  return apiRequest<ConversacionIa>(`${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/restaurar`, { method: 'PATCH' });
}

export function crearConversacionIa(
  idProyecto: string,
  titulo: string,
): Promise<ConversacionIa> {
  return apiRequest<ConversacionIa>(ruta(idProyecto), {
    method: 'POST',
    body: JSON.stringify({ titulo }),
  });
}

export function archivarConversacionIa(
  idProyecto: string,
  idConversacion: string,
): Promise<ConversacionIa> {
  return apiRequest<ConversacionIa>(
    `${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/archivar`,
    { method: 'PATCH' },
  );
}

export function listarMensajesIa(
  idProyecto: string,
  idConversacion: string,
  limite = 50,
  desplazamiento = 0,
): Promise<MensajeIa[]> {
  return apiRequest<MensajeIa[]>(
    `${rutaMensajes(idProyecto, idConversacion)}?limite=${limite}&desplazamiento=${desplazamiento}`,
  );
}

export function enviarMensajeIa(
  idProyecto: string,
  idConversacion: string,
  contenido: string,
): Promise<MensajeIa> {
  return apiRequest<MensajeIa>(rutaMensajes(idProyecto, idConversacion), {
    method: 'POST',
    body: JSON.stringify({ contenido }),
  });
}

// Acción explícita de CU-09. No altera el flujo de mensajes colaborativos de CU-12.
export function consultarAsistenteIa(
  idProyecto: string,
  idConversacion: string,
  contenido: string,
  idsConversacionesContexto: readonly string[] = [],
): Promise<ResultadoConsultaIa> {
  return apiRequest<ResultadoConsultaIa>(
    `${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/consultas-ia`,
    { method: 'POST', body: JSON.stringify({ contenido, idsConversacionesContexto }) },
  );
}

// Contexto del servidor, nunca un JSON enviado por el navegador.
export function analizarModeloUmlConIa(
  idProyecto: string,
  idConversacion: string,
  idModelo: string,
  contenido: string,
): Promise<ResultadoAnalisisModeloIa> {
  return apiRequest<ResultadoAnalisisModeloIa>(
    `${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/modelos-uml/${encodeURIComponent(idModelo)}/analisis-ia`,
    { method: 'POST', body: JSON.stringify({ contenido }) },
  );
}

const rutaPropuestas = (idProyecto: string, idConversacion: string, idModelo: string) =>
  `${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/modelos-uml/${encodeURIComponent(idModelo)}/propuestas-ia`;

export function generarPropuestaUmlIa(idProyecto: string, idConversacion: string, idModelo: string, contenido: string): Promise<ResultadoGenerarPropuestaUmlIa> {
  return apiRequest<ResultadoGenerarPropuestaUmlIa>(rutaPropuestas(idProyecto, idConversacion, idModelo), {
    method: 'POST', body: JSON.stringify({ contenido }),
  });
}
export function listarPropuestasUmlIa(idProyecto: string, idConversacion: string, idModelo: string): Promise<PropuestaUmlIa[]> {
  return apiRequest<PropuestaUmlIa[]>(rutaPropuestas(idProyecto, idConversacion, idModelo));
}
export function rechazarPropuestaUmlIa(idProyecto: string, idConversacion: string, idModelo: string, idPropuesta: string): Promise<PropuestaUmlIa> {
  return apiRequest<PropuestaUmlIa>(`${rutaPropuestas(idProyecto, idConversacion, idModelo)}/${encodeURIComponent(idPropuesta)}/rechazar`, { method: 'POST' });
}

export function aplicarPropuestaUmlIa(idProyecto: string, idConversacion: string, idModelo: string, idPropuesta: string): Promise<ResultadoAplicacionUmlIa> {
  return apiRequest<ResultadoAplicacionUmlIa>(`${rutaPropuestas(idProyecto, idConversacion, idModelo)}/${encodeURIComponent(idPropuesta)}/aplicar`, { method: 'POST' });
}

// CU-09 voz: no almacena el audio y solo devuelve texto editable. La persona
// decide luego si lo envía, consulta al asistente o propone cambios UML.
export function transcribirAudioIa(idProyecto: string, idConversacion: string, audio: Blob, extension: string): Promise<{ texto: string }> {
  const form = new FormData();
  form.append('audio', audio, `voz.${extension}`);
  return apiRequest<{ texto: string }>(
    `${ruta(idProyecto)}/${encodeURIComponent(idConversacion)}/transcripciones-audio`,
    { method: 'POST', body: form },
  );
}
