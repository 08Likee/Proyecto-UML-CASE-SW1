import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { analizarModeloUmlConIa, consultarAsistenteIa, enviarMensajeIa, listarMensajesIa, listarConversacionesIa, generarPropuestaUmlIa, listarPropuestasUmlIa, rechazarPropuestaUmlIa, aplicarPropuestaUmlIa, transcribirAudioIa } from '../api/conversaciones-ia.api';
import { actualizarFuentesContexto, MAX_FUENTES_CONTEXTO } from '../helpers/seleccion-contexto';
import { elegirMimeGrabacion, DURACION_MAXIMA_AUDIO_MS, verificarAudioGrabado } from '../helpers/audio-ia.helpers';
import { prepararTraspasoOrdenUml } from '../../cu09-interactuar-asistente-ia/services/preparar-traspaso-orden-uml';
import { encontrarPropuestaDeMensajeIa, unirMensajes } from '../helpers/conversaciones-ia.helpers';
import type { ConversacionIa, MensajeIa, PropuestaUmlIa, ResultadoAnalisisModeloIa } from '../types/conversaciones-ia.types';
import { RespuestaMarkdown } from './RespuestaMarkdown';
import { PropuestasUmlIa } from './PropuestasUmlIa';

interface Props {
  idProyecto: string;
  conversacion: ConversacionIa;
  idUsuario: string;
  idModeloAbierto?: string;
  nombreModeloAbierto?: string;
  puedeEditarModelo?: boolean;
  puedeAplicarModelo?: boolean;
  onAplicacionUml?: (estadoYjsBase64: string, version: number) => void;
  onRevisarOrdenUml?: (instruccion: string, idConversacion: string) => void;
  enfocarRedactorAlAbrir?: boolean;
  onRedactorEnfocado?: () => void;
  onActividad: () => void;
}

const TAMANO_PAGINA = 50;

function descripcionError(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo consultar la conversación.';
}

function fechaLegible(valor: string): string {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleString();
}

export function HistorialConversacion({ idProyecto, conversacion, idUsuario, idModeloAbierto, nombreModeloAbierto, puedeEditarModelo = false, puedeAplicarModelo = false, onAplicacionUml, onRevisarOrdenUml, enfocarRedactorAlAbrir = false, onRedactorEnfocado, onActividad }: Props) {
  const [mensajes, setMensajes] = useState<MensajeIa[]>([]);
  const [contenido, setContenido] = useState('');
  const [estadoVoz, setEstadoVoz] = useState<'INACTIVA' | 'PREPARANDO' | 'GRABANDO' | 'TRANSCRIBIENDO'>('INACTIVA');
  const [avisoVoz, setAvisoVoz] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [modoRespuesta, setModoRespuesta] = useState<'GROQ' | 'RESPALDO' | null>(null);
  const [mostrarSelectorContexto, setMostrarSelectorContexto] = useState(false);
  const [conversacionesFuente, setConversacionesFuente] = useState<ConversacionIa[]>([]);
  const [fuentesSeleccionadas, setFuentesSeleccionadas] = useState<string[]>([]);
  const [cargandoFuentes, setCargandoFuentes] = useState(false);
  const [cargandoMasFuentes, setCargandoMasFuentes] = useState(false);
  const [hayMasFuentes, setHayMasFuentes] = useState(false);
  const [resumenAnalisis, setResumenAnalisis] = useState<string | null>(null);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [hayAnteriores, setHayAnteriores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accesoDisponible, setAccesoDisponible] = useState(true);
  const [propuestas, setPropuestas] = useState<PropuestaUmlIa[]>([]);
  const [mostrarPropuestas, setMostrarPropuestas] = useState(false);
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const botonesRef = useRef<HTMLDivElement | null>(null);
  const grabadorRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const relojVozRef = useRef<number | null>(null);
  const montadoRef = useRef(true);

  // Audio efímero: cerrar el chat nunca deja el micrófono abierto.
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      if (relojVozRef.current !== null) window.clearTimeout(relojVozRef.current);
      const grabador = grabadorRef.current;
      if (grabador) {
        grabador.onstop = null;
        grabador.ondataavailable = null;
        if (grabador.state !== 'inactive') grabador.stop();
      }
      streamRef.current?.getTracks().forEach((pista) => pista.stop());
    };
  }, [conversacion.id]);

  const liberarMicrofono = () => {
    if (relojVozRef.current !== null) {
      window.clearTimeout(relojVozRef.current);
      relojVozRef.current = null;
    }
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
    grabadorRef.current = null;
  };

  const detenerGrabacion = () => {
    if (grabadorRef.current?.state === 'recording') {
      setEstadoVoz('TRANSCRIBIENDO');
      grabadorRef.current.stop();
    }
  };

  const iniciarGrabacion = async () => {
    if (estadoVoz !== 'INACTIVA' || enviando || cargando || !accesoDisponible) return;
    setAvisoVoz(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAvisoVoz('Este navegador no admite grabación de audio o requiere HTTPS/localhost. Podés escribir el mensaje.');
      return;
    }
    const tipo = elegirMimeGrabacion((mime) => MediaRecorder.isTypeSupported(mime));
    if (!tipo) {
      setAvisoVoz('El navegador no ofrece un formato de audio compatible. Podés escribir el mensaje.');
      return;
    }
    let stream: MediaStream | null = null;
    setEstadoVoz('PREPARANDO');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!montadoRef.current) { stream.getTracks().forEach((pista) => pista.stop()); return; }
      const grabador = new MediaRecorder(stream, { mimeType: tipo });
      streamRef.current = stream;
      grabadorRef.current = grabador;
      const fragmentos: BlobPart[] = [];
      grabador.ondataavailable = (evento) => { if (evento.data.size > 0) fragmentos.push(evento.data); };
      grabador.onstop = () => {
        const archivo = new Blob(fragmentos, { type: grabador.mimeType || tipo });
        liberarMicrofono();
        if (!montadoRef.current) return;
        void (async () => {
          try {
            const extension = verificarAudioGrabado(archivo.type, archivo.size);
            const resultado = await transcribirAudioIa(idProyecto, conversacion.id, archivo, extension);
            if (!montadoRef.current) return;
            setContenido((previo) => [previo.trim(), resultado.texto.trim()].filter(Boolean).join(' '));
            setAvisoVoz('Transcripción recibida. Revisá y corregí el texto antes de enviarlo.');
            editorRef.current?.focus({ preventScroll: true });
          } catch (fallo: unknown) {
            if (montadoRef.current) setAvisoVoz(`No se pudo transcribir: ${descripcionError(fallo)}. Podés escribir el mensaje.`);
          } finally {
            if (montadoRef.current) setEstadoVoz('INACTIVA');
          }
        })();
      };
      grabador.onerror = () => {
        grabador.onstop = null;
        liberarMicrofono();
        if (montadoRef.current) { setEstadoVoz('INACTIVA'); setAvisoVoz('No se pudo grabar el audio. Podés escribir el mensaje.'); }
      };
      grabador.start(1000);
      setEstadoVoz('GRABANDO');
      relojVozRef.current = window.setTimeout(detenerGrabacion, DURACION_MAXIMA_AUDIO_MS);
    } catch {
      stream?.getTracks().forEach((pista) => pista.stop());
      liberarMicrofono();
      if (montadoRef.current) { setEstadoVoz('INACTIVA'); setAvisoVoz('No se pudo acceder al micrófono. Revisá los permisos del navegador.'); }
    }
  };

  // Solo tras crear un chat: esperar a que el historial autorice el acceso y
  // llevar el formulario a la vista, incluyendo los botones inferiores.
  useEffect(() => {
    if (!enfocarRedactorAlAbrir || cargando || !accesoDisponible || conversacion.estado !== 'ACTIVA') return;
    if (!editorRef.current || !botonesRef.current) return;
    botonesRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    editorRef.current.focus({ preventScroll: true });
    onRedactorEnfocado?.();
  }, [enfocarRedactorAlAbrir, cargando, accesoDisponible, conversacion.estado, onRedactorEnfocado]);

  const actualizar = async (): Promise<void> => {
    try {
      const ultimos = await listarMensajesIa(idProyecto, conversacion.id, TAMANO_PAGINA);
      setMensajes((actuales) => unirMensajes(actuales, ultimos));
      setError(null);
      setAccesoDisponible(true);
    } catch (unknownError: unknown) {
      // No conservar datos sensibles visibles después de un fallo de acceso.
      setMensajes([]);
      setAccesoDisponible(false);
      setError(descripcionError(unknownError));
    }
  };

  useEffect(() => {
    let vigente = true;
    let consultando = false;

    const consultar = async (primera: boolean) => {
      if (consultando) return;
      consultando = true;
      try {
        const ultimos = await listarMensajesIa(idProyecto, conversacion.id, TAMANO_PAGINA);
        if (!vigente) return;
        setMensajes((actuales) => primera ? ultimos : unirMensajes(actuales, ultimos));
        if (primera) {
          setDesplazamiento(ultimos.length);
          setHayAnteriores(ultimos.length === TAMANO_PAGINA);
        }
        setAccesoDisponible(true);
        setError(null);
      } catch (unknownError: unknown) {
        if (!vigente) return;
        setMensajes([]);
        setAccesoDisponible(false);
        setError(descripcionError(unknownError));
      } finally {
        consultando = false;
        if (vigente && primera) setCargando(false);
      }
    };

    void consultar(true);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') void consultar(false);
    }, 12000);

    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, [idProyecto, conversacion.id]);

  useEffect(() => {
    if (!idModeloAbierto) { return; }
    let vigente = true;
    const consultar = () => {
      if (document.visibilityState === 'hidden') return;
      void listarPropuestasUmlIa(idProyecto, conversacion.id, idModeloAbierto)
        .then((resultado) => { if (vigente) setPropuestas(resultado); })
        .catch(() => { if (vigente) setPropuestas([]); });
    };
    consultar();
    // Los cambios aprobados por otra persona también se reflejan sin F5.
    const intervalo = window.setInterval(consultar, 12000);
    return () => { vigente = false; window.clearInterval(intervalo); };
  }, [idProyecto, conversacion.id, idModeloAbierto]);

  const refrescarPropuestas = async () => {
    if (!idModeloAbierto) return;
    const recientes = await listarPropuestasUmlIa(idProyecto, conversacion.id, idModeloAbierto);
    setPropuestas(recientes);
  };

  const rechazarPropuesta = async (id: string) => {
    if (!idModeloAbierto || !puedeEditarModelo || rechazando) return;
    if (!window.confirm('¿Rechazar esta propuesta? El UML no se modificará.')) return;
    setRechazando(id);
    try {
      await rechazarPropuestaUmlIa(idProyecto, conversacion.id, idModeloAbierto, id);
      await refrescarPropuestas();
    } catch (e: unknown) {
      setError(descripcionError(e));
    } finally {
      setRechazando(null);
    }
  };

  const traspasarOrdenUml = () => {
    if (!onRevisarOrdenUml) return;
    const texto = prepararTraspasoOrdenUml(contenido, {
      idModeloAbierto,
      puedeEditarModelo,
      modeloSincronizado: puedeAplicarModelo,
      conversacionActiva: conversacion.estado === 'ACTIVA',
      accesoDisponible,
      procesando: enviando || cargando,
      vozInactiva: estadoVoz === 'INACTIVA',
    });
    if (texto) onRevisarOrdenUml(texto, conversacion.id);
  };

  const aplicarPropuesta = async (id: string) => {
    if (!idModeloAbierto || !puedeEditarModelo || !puedeAplicarModelo || !onAplicacionUml || aplicando || rechazando) return;
    const objetivo = propuestas.find((p) => p.id === id);
    if (!objetivo || objetivo.estado !== 'PENDIENTE' || !objetivo.vigente) return;
    if (!window.confirm(`¿Aceptar y APLICAR la propuesta UML?\n\n${objetivo.datos.resumen}\n\nSe modificarán las clases/relaciones persistidas para todos los participantes. No se puede deshacer con el botón Rechazar.`)) return;
    setAplicando(id);
    setError(null);
    try {
      const resultado = await aplicarPropuestaUmlIa(idProyecto, conversacion.id, idModeloAbierto, id);
      // El servidor YA confirmó la transacción. Enviar el estado Yjs a los participantes.
      try {
        onAplicacionUml(resultado.estadoYjsBase64, resultado.modelo.version);
        setResumenAnalisis(`Propuesta aplicada al UML con autorización humana. Nueva versión v${resultado.modelo.version}.`);
      } catch {
        setError('Los cambios se aplicaron y guardaron en el servidor, pero no pudieron sincronizarse en este navegador. Volvé a abrir el modelo para recuperar la versión vigente.');
      }
      await refrescarPropuestas();
      onActividad();
    } catch (e: unknown) {
      await refrescarPropuestas().catch(() => {});
      setError(`No se aplicó la propuesta: ${descripcionError(e)}. Verificá su estado antes de volver a intentar.`);
    } finally {
      setAplicando(null);
    }
  };

  const cargarAnteriores = async () => {
    if (cargandoAnteriores || !hayAnteriores || !accesoDisponible) return;
    setCargandoAnteriores(true);
    try {
      const anteriores = await listarMensajesIa(
        idProyecto, conversacion.id, TAMANO_PAGINA, desplazamiento,
      );
      setMensajes((actuales) => unirMensajes(actuales, anteriores));
      setDesplazamiento((actual) => actual + anteriores.length);
      setHayAnteriores(anteriores.length === TAMANO_PAGINA);
      setError(null);
    } catch (unknownError: unknown) {
      setMensajes([]);
      setAccesoDisponible(false);
      setError(descripcionError(unknownError));
    } finally {
      setCargandoAnteriores(false);
    }
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const texto = contenido.trim();
    if (!texto || texto.length > 8000 || enviando || conversacion.estado !== 'ACTIVA' || !accesoDisponible) return;
    setEnviando(true);
    setError(null);
    setModoRespuesta(null);
    setResumenAnalisis(null);
    try {
      const guardado = await enviarMensajeIa(idProyecto, conversacion.id, texto);
      setMensajes((actuales) => unirMensajes(actuales, [guardado]));
      setContenido('');
      onActividad();
    } catch (unknownError: unknown) {
      // El texto permanece en el editor para que el usuario pueda reintentar.
      setError(descripcionError(unknownError));
    } finally {
      setEnviando(false);
    }
  };

  const mostrarOpcionesContexto = async () => {
    if (mostrarSelectorContexto) { setMostrarSelectorContexto(false); return; }
    setMostrarSelectorContexto(true);
    setCargandoFuentes(true);
    try {
      const pagina = await listarConversacionesIa(idProyecto, 100);
      setConversacionesFuente(pagina);
      setHayMasFuentes(pagina.length === 100);
      setError(null);
    } catch (e: unknown) {
      setConversacionesFuente([]);
      setError(`No se pudieron consultar los chats de contexto: ${descripcionError(e)}`);
    } finally {
      setCargandoFuentes(false);
    }
  };

  const cargarMasFuentes = async () => {
    if (!hayMasFuentes || cargandoMasFuentes) return;
    setCargandoMasFuentes(true);
    try {
      const pagina = await listarConversacionesIa(idProyecto, 100, conversacionesFuente.length);
      setConversacionesFuente((actuales) => [...actuales, ...pagina.filter((c) => !actuales.some((a) => a.id === c.id))]);
      setHayMasFuentes(pagina.length === 100);
      setError(null);
    } catch (e: unknown) {
      setError(`No se pudieron cargar más conversaciones: ${descripcionError(e)}`);
    } finally {
      setCargandoMasFuentes(false);
    }
  };

  const consultarIa = async (analizarModelo = false) => {
    const texto = contenido.trim();
    if (!texto || texto.length > 8000 || enviando || conversacion.estado !== 'ACTIVA' || !accesoDisponible) return;
    if (analizarModelo && !idModeloAbierto) return;
    setEnviando(true);
    setError(null);
    setModoRespuesta(null);
    setResumenAnalisis(null);
    try {
      const resultado = analizarModelo && idModeloAbierto
        ? await analizarModeloUmlConIa(idProyecto, conversacion.id, idModeloAbierto, texto)
        : await consultarAsistenteIa(idProyecto, conversacion.id, texto, fuentesSeleccionadas);
      setMensajes((actuales) => unirMensajes(actuales, [resultado.mensajeUsuario, resultado.mensajeIa]));
      setContenido('');
      if (!analizarModelo) {
        setFuentesSeleccionadas([]); // Consentimiento nuevo para cada consulta.
        if (resultado.fuentesConsultadas?.length) {
          setResumenAnalisis(`${resultado.modoRespuesta === 'GROQ' ? 'Antecedentes enviados a GroqCloud' : 'Se intentó consultar antecedentes, pero GroqCloud no respondió'}: ${resultado.fuentesConsultadas.map((f) => f.titulo).join(', ')}. Solo se usaron en esta consulta.`);
        }
      }
      setModoRespuesta(resultado.modoRespuesta);
      if (analizarModelo && idModeloAbierto) {
        const analisis = resultado as ResultadoAnalisisModeloIa;
        setResumenAnalisis(`${resultado.modoRespuesta === 'GROQ' ? 'Análisis generado' : 'Solicitud contextual registrada'} para «${analisis.modeloAnalizado.nombre}» (versión persistida v${analisis.modeloAnalizado.version}). No se modificó el UML.`);
      }
      onActividad();
    } catch (unknownError: unknown) {
      // El mensaje humano podría haber quedado guardado antes del error.
      // Actualizamos el historial y evitamos sugerir un reintento ciego.
      await actualizar();
      setError(`No se completó la consulta a IA: ${descripcionError(unknownError)}. Revisa el historial antes de intentar nuevamente.`);
    } finally {
      setEnviando(false);
    }
  };

  const proponerIa = async () => {
    const texto = contenido.trim();
    if (!texto || texto.length > 8000 || enviando || conversacion.estado !== 'ACTIVA' || !accesoDisponible || !idModeloAbierto) return;
    setEnviando(true);
    setError(null);
    setModoRespuesta(null);
    setResumenAnalisis(null);
    try {
      const resultado = await generarPropuestaUmlIa(idProyecto, conversacion.id, idModeloAbierto, texto);
      setMensajes((actuales) => unirMensajes(actuales, [resultado.mensajeUsuario, resultado.mensajeIa]));
      setContenido('');
      if (resultado.propuesta) {
        setPropuestas((actuales) => [resultado.propuesta!, ...actuales.filter((p) => p.id !== resultado.propuesta!.id)]);
        setMostrarPropuestas(true);
      }
      if (resultado.modoRespuesta === 'RESPALDO') setModoRespuesta('RESPALDO');
      onActividad();
    } catch (e: unknown) {
      await actualizar();
      setError(`No se completó la propuesta: ${descripcionError(e)}. Revisá el historial antes de reintentar.`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="cu12-historial" aria-label={`Historial de ${conversacion.titulo}`}>
      <header className="cu12-historial-titulo">
        <div>
          <h3>{conversacion.titulo}</h3>
          <span className="muted">{conversacion.estado === 'ACTIVA' ? 'Conversación compartida' : 'Conversación archivada · solo lectura'}</span>
        </div>
        <button type="button" onClick={() => void actualizar()} disabled={cargando || enviando}>
          Actualizar
        </button>
      </header>

      {error && <p className="alert error-alert" role="alert">{error}</p>}
      {cargando && <p className="muted">Cargando mensajes…</p>}

      {!cargando && accesoDisponible && (
        <div className="cu12-mensajes" role="log" aria-label="Mensajes de la conversación" aria-live="polite">
          {hayAnteriores && (
            <button type="button" className="cu12-anteriores" disabled={cargandoAnteriores} onClick={() => void cargarAnteriores()}>
              {cargandoAnteriores ? 'Cargando…' : 'Cargar mensajes anteriores'}
            </button>
          )}
          {mensajes.length === 0 && (
            <p className="cu12-vacio">{conversacion.estado === 'ARCHIVADA' ? 'Esta conversación archivada no contiene mensajes.' : 'Todavía no hay mensajes. Escribe el primero para iniciar la conversación.'}</p>
          )}
          {mensajes.map((mensaje) => {
            const esMio = mensaje.tipoEmisor === 'USUARIO' && mensaje.idUsuario === idUsuario;
            const propuestaRelacionada = mensaje.tipoEmisor === 'IA'
              ? encontrarPropuestaDeMensajeIa(mensaje.contenido, propuestas)
              : null;
            return (
              <article className={`cu12-mensaje ${esMio ? 'cu12-mensaje-propio' : ''}`} key={mensaje.id}>
                <div className="cu12-mensaje-meta">
                  <strong>{mensaje.tipoEmisor === 'IA' ? 'Asistente IA' : esMio ? 'Tú' : 'Participante'}</strong>
                  <time dateTime={mensaje.fechaCreacion}>{fechaLegible(mensaje.fechaCreacion)}</time>
                </div>
                {mensaje.tipoEmisor === 'IA'
                  ? <RespuestaMarkdown contenido={mensaje.contenido} />
                  : <p>{mensaje.contenido}</p>}
                {propuestaRelacionada && propuestaRelacionada.estado !== 'PENDIENTE' && (
                  <p className="cu13-estado-historico" role="status">
                    Estado actual de la propuesta: <strong>{propuestaRelacionada.estado}</strong>.
                    {propuestaRelacionada.estado === 'APLICADA'
                      ? ` Los cambios ya se aplicaron al UML (versión actual v${propuestaRelacionada.versionActual}).`
                      : ' La propuesta fue rechazada; no se aplicaron sus cambios.'}
                    {' '}El mensaje anterior describe únicamente el momento de su generación.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {idModeloAbierto && accesoDisponible && (
        <section className="cu13-propuestas-panel">
          <button type="button" data-cu11-control="ver-propuestas" onClick={() => setMostrarPropuestas((actual) => !actual)}>
            {mostrarPropuestas ? 'Ocultar propuestas UML' : `Ver propuestas UML (${propuestas.length})`}
          </button>
          {mostrarPropuestas && (propuestas.length
            ? <PropuestasUmlIa propuestas={propuestas} puedeEditarModelo={puedeEditarModelo} puedeAplicarModelo={puedeAplicarModelo} aplicando={aplicando} rechazando={rechazando} onAplicar={(id) => void aplicarPropuesta(id)} onRechazar={(id) => void rechazarPropuesta(id)} />
            : <p className="muted">Todavía no hay propuestas guardadas para este modelo en esta conversación.</p>
          )}
        </section>
      )}

      {conversacion.estado === 'ACTIVA' && accesoDisponible && (
        <form className="cu12-redactar" onSubmit={(evento) => void enviar(evento)}>
          <label htmlFor="cu12-mensaje-input">Nuevo mensaje</label>
          <textarea
            data-cu11-control="editor-conversacion"
            ref={editorRef}
            id="cu12-mensaje-input"
            placeholder="Escribe un mensaje para los participantes del proyecto…"
            value={contenido}
            maxLength={8000}
            rows={3}
            disabled={enviando || cargando}
            onChange={(evento) => setContenido(evento.target.value)}
          />
          <div className="cu09-voz-controles">
            <button
              type="button"
              onClick={() => estadoVoz === 'GRABANDO' ? detenerGrabacion() : void iniciarGrabacion()}
              disabled={enviando || cargando || estadoVoz === 'TRANSCRIBIENDO' || estadoVoz === 'PREPARANDO'}
              aria-pressed={estadoVoz === 'GRABANDO'}
              className={estadoVoz === 'GRABANDO' ? 'cu09-voz-grabando' : ''}
            >
              {estadoVoz === 'GRABANDO' ? '■ Detener grabación' : estadoVoz === 'TRANSCRIBIENDO' ? 'Transcribiendo…' : estadoVoz === 'PREPARANDO' ? 'Abriendo micrófono…' : '🎙 Dictar por voz'}
            </button>
            <span className="muted">Máximo 60 segundos. El audio se envía a GroqCloud para transcribir; no se publica ni ejecuta hasta que revises el texto.</span>
          </div>
          {avisoVoz && <p className="cu09-voz-aviso" role="status">{avisoVoz}</p>}
          <section className="cu12-contexto-cruzado" aria-label="Contexto adicional de otras conversaciones">
            <button type="button" aria-expanded={mostrarSelectorContexto} onClick={() => void mostrarOpcionesContexto()} disabled={enviando || cargando}>
              {mostrarSelectorContexto ? 'Ocultar chats de contexto' : 'Seleccionar chats de contexto'}
              {fuentesSeleccionadas.length > 0 ? ` (${fuentesSeleccionadas.length})` : ''}
            </button>
            <span className="muted">Opcional: solo para la próxima acción «Consultar IA». Ningún otro chat se lee por defecto; al terminar se limpia la selección.</span>
            {mostrarSelectorContexto && (
              <div className="cu12-contexto-fuentes">
                {cargandoFuentes && <span className="muted">Cargando conversaciones autorizadas…</span>}
                {!cargandoFuentes && conversacionesFuente.filter((c) => c.id !== conversacion.id).length === 0 && (
                  <span className="muted">No hay otras conversaciones disponibles en el proyecto.</span>
                )}
                {!cargandoFuentes && conversacionesFuente.filter((c) => c.id !== conversacion.id).map((fuente) => (
                  <label key={fuente.id} className="cu12-contexto-opcion">
                    <input
                      type="checkbox"
                      checked={fuentesSeleccionadas.includes(fuente.id)}
                      disabled={enviando || (!fuentesSeleccionadas.includes(fuente.id) && fuentesSeleccionadas.length >= MAX_FUENTES_CONTEXTO)}
                      onChange={(evento) => setFuentesSeleccionadas((actuales) => actualizarFuentesContexto(actuales, fuente.id, evento.target.checked, conversacion.id))}
                    />
                    <span>{fuente.titulo} <small className="muted">({fuente.estado === 'ARCHIVADA' ? 'archivada' : 'activa'})</small></span>
                  </label>
                ))}
                {hayMasFuentes && <button type="button" onClick={() => void cargarMasFuentes()} disabled={cargandoMasFuentes}>{cargandoMasFuentes ? 'Cargando…' : 'Cargar más conversaciones'}</button>}
                <span className="muted">Máximo {MAX_FUENTES_CONTEXTO} chats, con hasta 4 mensajes recientes de cada uno. Solo el servidor recupera sus textos y verifica el acceso.</span>
              </div>
            )}
          </section>
          <div className="cu12-redactar-acciones">
            <span className="muted">{contenido.length}/8000 · «Consultar IA» es una consulta general a GroqCloud. {idModeloAbierto
              ? `«Analizar modelo UML» envía a GroqCloud las clases y relaciones de la versión persistida de «${nombreModeloAbierto ?? 'modelo abierto'}», además de la pregunta y el historial de este chat. No modifica el diagrama.`
              : 'No se incluye el contenido de un diagrama UML.'}</span>
            <div ref={botonesRef} className="cu12-botones-envio">
              <button type="submit" data-cu11-control="enviar-equipo" disabled={!contenido.trim() || enviando || cargando || estadoVoz !== 'INACTIVA'}>
                {enviando ? 'Procesando…' : 'Enviar al equipo'}
              </button>
              <button type="button" data-cu11-control="consultar-ia" className="primary-button" onClick={() => void consultarIa()} disabled={!contenido.trim() || enviando || cargando || estadoVoz !== 'INACTIVA'}>
                {enviando ? 'Consultando…' : 'Consultar IA'}
              </button>
              {idModeloAbierto && (
                <button type="button" data-cu11-control="analizar-uml" className="cu13-analizar-boton" onClick={() => void consultarIa(true)} disabled={!contenido.trim() || enviando || cargando || estadoVoz !== 'INACTIVA'} title="Analizar el modelo persistido sin modificarlo">
                  {enviando ? 'Analizando…' : 'Analizar modelo UML'}
                </button>
              )}
              {idModeloAbierto && onRevisarOrdenUml && puedeEditarModelo && (
                <button
                  type="button"
                  className="cu13-analizar-boton"
                  onClick={traspasarOrdenUml}
                  disabled={!prepararTraspasoOrdenUml(contenido, {
                    idModeloAbierto, puedeEditarModelo, modeloSincronizado: puedeAplicarModelo,
                    conversacionActiva: conversacion.estado === 'ACTIVA',
                    accesoDisponible, procesando: enviando || cargando,
                    vozInactiva: estadoVoz === 'INACTIVA',
                  })}
                  title="Abrir el asistente UML con este texto para revisarlo; no ejecuta cambios automáticamente"
                >
                  Revisar orden UML
                </button>
              )}
              {idModeloAbierto && (
                <button type="button" data-cu11-control="proponer-uml" className="cu13-analizar-boton" onClick={() => void proponerIa()} disabled={!contenido.trim() || enviando || cargando || estadoVoz !== 'INACTIVA'} title="Generar una propuesta validada para revisión, sin modificar el UML">
                  {enviando ? 'Preparando…' : 'Proponer cambios UML'}
                </button>
              )}
            </div>
          </div>
          {idModeloAbierto && onRevisarOrdenUml && puedeEditarModelo && (
            <p className="muted">«Revisar orden UML» abre el asistente existente con el texto escrito o dictado; no lo envía al chat ni modifica el modelo hasta que confirmes «Interpretar y ejecutar».</p>
          )}
        </form>
      )}
      {resumenAnalisis && <p className="cu13-analisis-aviso" role="status">{resumenAnalisis}</p>}
      {modoRespuesta === 'RESPALDO' && (
        <p className="cu12-aviso-respaldo" role="status">GroqCloud no respondió. Se guardaron la consulta y el aviso de respaldo; no se generó una respuesta del modelo.</p>
      )}
      {conversacion.estado === 'ARCHIVADA' && (
        <p className="cu12-solo-lectura">Esta conversación está archivada. Puedes leer el historial, pero no enviar nuevos mensajes.</p>
      )}
    </section>
  );
}
