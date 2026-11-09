import { useState } from 'react';
import type { ResultadoOrdenUmlParaRegistro } from '../services/trazabilidad-orden-uml';
import type { ModeloUmlContenido } from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types';
import { useModeladorStore } from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/store/modelador.store';
import { ejecutarIntencionSobreModelo } from '../services/ejecutar-intencion-modelo';
import { interpretarOrdenExplicita } from '../services/interpretar-orden-explicita';
import { prevalidarRelacionIncompleta } from '../services/prevalidar-relacion-incompleta';
import {
  completarAtributoIncompleto,
  detectarAtributoIncompleto,
  type AtributoPendienteLocal,
} from '../services/prevalidar-atributo-incompleto';
import {
  cargarIaLocal,
  iaLocalCargada,
  iaLocalRequierePreparacionManual,
  interpretarInstruccionWebLlm,
  MODELO_WEBLLM_CU09,
  type ContextoPendienteAsistente,
} from '../services/interpretar-instruccion-webllm';
import '../styles/cu09.css';

interface AsistenteIaPanelProps {
  contenido: ModeloUmlContenido;
  puedeEditar: boolean;
  instruccionInicial?: string;
  versionModelo: number;
  onRegistrarResultado?: (resultado: ResultadoOrdenUmlParaRegistro) => Promise<number | null>;
  alCerrar: () => void;
}

type EstadoModeloIa = 'NO_CARGADO' | 'CARGANDO' | 'LISTO' | 'ERROR';

function mensajeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error.trim();

  if (typeof error === 'object' && error !== null) {
    const posibleMensaje = (error as { message?: unknown }).message;
    if (typeof posibleMensaje === 'string' && posibleMensaje.trim()) {
      return posibleMensaje.trim();
    }
  }

  return fallback;
}

export function AsistenteIaPanel({
  contenido,
  puedeEditar,
  instruccionInicial,
  versionModelo,
  onRegistrarResultado,
  alCerrar,
}: AsistenteIaPanelProps) {
  const aplicarContenidoAsistente = useModeladorStore(
    (state) => state.aplicarContenidoAsistente,
  );
  const [instruccion, setInstruccion] = useState(instruccionInicial ?? '');
  const [estadoModelo, setEstadoModelo] = useState<EstadoModeloIa>(
    iaLocalCargada() ? 'LISTO' : iaLocalRequierePreparacionManual() ? 'ERROR' : 'NO_CARGADO',
  );
  const [progreso, setProgreso] = useState(iaLocalCargada() ? 1 : 0);
  const [detalleCarga, setDetalleCarga] = useState(
    iaLocalCargada()
      ? 'Modelo local listo.'
      : iaLocalRequierePreparacionManual()
        ? 'WebLLM requiere preparación manual. Las órdenes explícitas siguen disponibles.'
        : 'Modelo local todavía no cargado.',
  );
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [tipoMensaje, setTipoMensaje] = useState<'INFO' | 'EXITO' | 'ERROR'>(
    'INFO',
  );
  const [contextoPendiente, setContextoPendiente] =
    useState<ContextoPendienteAsistente | null>(null);
  const [atributoPendienteLocal, setAtributoPendienteLocal] =
    useState<AtributoPendienteLocal | null>(null);
  const [trazabilidadActiva, setTrazabilidadActiva] = useState(Boolean(instruccionInicial && onRegistrarResultado));
  const [avisoRegistro, setAvisoRegistro] = useState<string | null>(null);

  const registrarResultado = async (
    estado: ResultadoOrdenUmlParaRegistro['estado'],
    ordenProcesada: string,
    detalle: string,
    versionAnterior: number,
    contenidoAplicado?: ModeloUmlContenido,
  ) => {
    if (!trazabilidadActiva || !onRegistrarResultado) return;
    try {
      const version = await onRegistrarResultado({ estado, ordenProcesada, detalle, versionAnterior, contenidoAplicado });
      setAvisoRegistro(estado === 'APLICADA'
        ? `Resultado compartido en la conversación; modelo persistido comprobado en v${version}.`
        : 'Se guardó una constancia informativa en la conversación compartida.');
    } catch (error: unknown) {
      setAvisoRegistro(`No se pudo registrar la constancia en el chat: ${mensajeError(error, 'error de acceso o sincronización')}. El resultado del asistente sigue indicado arriba; comprobá el modelo antes de reintentar.`);
    } finally {
      // Una aplicación confirmada se registra una sola vez. Si la orden se
      // rechaza o faltan datos, la persona puede corregirla en este panel
      // y el siguiente intento también quedará documentado.
      if (estado === 'APLICADA') setTrazabilidadActiva(false);
    }
  };

  const cargar = async (): Promise<boolean> => {
    if (iaLocalCargada()) {
      setEstadoModelo('LISTO');
      setProgreso(1);
      setDetalleCarga('Modelo local listo.');
      return true;
    }

    setEstadoModelo('CARGANDO');
    setMensaje(null);
    try {
      await cargarIaLocal(({ progreso: actual, texto }) => {
        setProgreso(actual);
        setDetalleCarga(texto);
      });
      setEstadoModelo('LISTO');
      setProgreso(1);
      setDetalleCarga('Modelo local listo.');
      return true;
    } catch (error: unknown) {
      setEstadoModelo('ERROR');
      setProgreso(0);
      setDetalleCarga('No se pudo preparar el motor de IA local.');
      setTipoMensaje('ERROR');
      setMensaje(
        mensajeError(error, 'No se pudo cargar el modelo local de IA.'),
      );
      return false;
    }
  };

  const procesar = async () => {
    if (!puedeEditar || procesando || !instruccion.trim()) return;

    setProcesando(true);
    setMensaje(null);
    setAvisoRegistro(null);
    const textoUsuario = instruccion.trim();
    const versionAnterior = versionModelo;
    try {
      const intencionDirecta = atributoPendienteLocal
        ? null
        : interpretarOrdenExplicita(textoUsuario, contenido, contextoPendiente !== null);
      // Si la orden completa no coincide, preguntamos localmente por campos
      // obligatorios en las formas de atributo inequívocas que conocemos.
      const prevalidacion = atributoPendienteLocal
        ? completarAtributoIncompleto(textoUsuario, contenido, atributoPendienteLocal)
        : !intencionDirecta && !contextoPendiente
          ? detectarAtributoIncompleto(textoUsuario, contenido)
          : null;
      if (prevalidacion?.estado === 'CANCELADA') {
        setAtributoPendienteLocal(null);
        setTipoMensaje('INFO');
        setMensaje('Solicitud de atributo cancelada.');
        await registrarResultado('NO_EJECUTADA', textoUsuario, 'El usuario canceló la solicitud pendiente; no se modificó el UML.', versionAnterior);
        setInstruccion('');
        return;
      }
      if (prevalidacion?.estado === 'ERROR') {
        setTipoMensaje('ERROR');
        setMensaje(prevalidacion.mensaje);
        await registrarResultado('NO_EJECUTADA', textoUsuario, prevalidacion.mensaje, versionAnterior);
        return;
      }
      if (prevalidacion?.estado === 'PREGUNTAR') {
        setAtributoPendienteLocal(prevalidacion.contexto);
        setTipoMensaje('INFO');
        setMensaje(prevalidacion.pregunta);
        await registrarResultado('FALTAN_DATOS', textoUsuario, prevalidacion.pregunta, versionAnterior);
        setInstruccion('');
        return;
      }
      const intencionLocal = prevalidacion?.estado === 'LISTA'
        ? prevalidacion.intencion
        : null;
      // Instrucciones inequívocamente incompletas: pedir datos sin consultar
      // WebLLM, sin inventar extremos y sin modificar el modelo.
      const avisoRelacion = !intencionDirecta && !intencionLocal &&
        !atributoPendienteLocal && !contextoPendiente
        ? prevalidarRelacionIncompleta(textoUsuario, false)
        : null;
      if (avisoRelacion) {
        setTipoMensaje('INFO');
        setMensaje(avisoRelacion);
        await registrarResultado('NO_EJECUTADA', textoUsuario, avisoRelacion, versionAnterior);
        return;
      }
      // Las órdenes reconocidas y las respuestas locales no necesitan WebGPU.
      if (!intencionDirecta && !intencionLocal) {
        if (iaLocalRequierePreparacionManual()) {
          setEstadoModelo('ERROR');
          setTipoMensaje('INFO');
          setMensaje('La interpretación libre de WebLLM está detenida tras un fallo. Podés seguir usando órdenes UML explícitas sin GPU. Para reintentar la interpretación libre, pulsá «Preparar IA local»; no se ejecutó ningún cambio.');
          await registrarResultado('NO_EJECUTADA', textoUsuario, 'No se ejecutó la orden porque la IA local no está disponible.', versionAnterior);
          return;
        }
        if (!(await cargar())) {
          await registrarResultado('NO_EJECUTADA', textoUsuario, 'No se ejecutó la orden porque la IA local no pudo prepararse.', versionAnterior);
          return;
        }
      }
      const intencion = intencionDirecta ?? intencionLocal ?? await interpretarInstruccionWebLlm(
        textoUsuario,
        contenido,
        contextoPendiente,
      );

      if (intencion.estado === 'FALTAN_DATOS') {
        setContextoPendiente({
          instruccionOriginal:
            contextoPendiente?.instruccionOriginal ?? textoUsuario,
          pregunta: intencion.pregunta,
          datosFaltantes: intencion.datosFaltantes,
        });
        setTipoMensaje('INFO');
        setMensaje(intencion.pregunta);
        await registrarResultado('FALTAN_DATOS', textoUsuario, intencion.pregunta, versionAnterior);
        setInstruccion('');
        return;
      }

      setContextoPendiente(null);
      if (intencion.estado === 'NO_SOPORTADA') {
        setTipoMensaje('ERROR');
        setMensaje(intencion.motivo);
        await registrarResultado('NO_EJECUTADA', textoUsuario, intencion.motivo, versionAnterior);
        return;
      }

      const resultado = ejecutarIntencionSobreModelo(contenido, intencion);
      if (resultado.exito === false) {
        setTipoMensaje('ERROR');
        setMensaje(resultado.mensaje);
        await registrarResultado('NO_EJECUTADA', textoUsuario, resultado.mensaje, versionAnterior);
        return;
      }

      aplicarContenidoAsistente(resultado.contenido, resultado.seleccion);
      setAtributoPendienteLocal(null);
      setTipoMensaje('EXITO');
      setMensaje(`${intencionDirecta || intencionLocal ? '[Interpretación directa] ' : ''}${resultado.accionesAplicadas.join(' ')}`);
      // La edición local puede tardar en sincronizarse: sólo publicar APLICADA
      // cuando la versión/contenido coincidan con el servidor autorizado.
      await registrarResultado('APLICADA', textoUsuario, resultado.accionesAplicadas.join(' '), versionAnterior, resultado.contenido);
      setInstruccion('');
    } catch (error: unknown) {
      if (!iaLocalCargada()) {
        setEstadoModelo('ERROR');
        setProgreso(0);
        setDetalleCarga('WebLLM detenido. Las órdenes explícitas no necesitan GPU.');
      }
      setTipoMensaje('ERROR');
      setMensaje(
        mensajeError(error, 'No se pudo interpretar la instrucción.'),
      );
      await registrarResultado('NO_EJECUTADA', textoUsuario, 'La interpretación no concluyó y no se ejecutó esta orden.', versionAnterior);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <aside className="cu09-panel" aria-label="Asistente de IA local">
      <div className="cu09-panel-header">
        <div>
          <span className="cu09-eyebrow">CU-09 · IA LOCAL</span>
          <h2>Asistente UML</h2>
        </div>
        <button type="button" className="cu09-close" onClick={alCerrar}>
          ×
        </button>
      </div>

      <div className="cu09-model-status">
        <div className="cu09-model-status-row">
          <strong>{MODELO_WEBLLM_CU09}</strong>
          <span>{estadoModelo === 'LISTO' ? 'Listo' : estadoModelo === 'ERROR' ? 'Error' : 'Local'}</span>
        </div>
        {estadoModelo === 'CARGANDO' && (
          <progress max={1} value={progreso} aria-label="Carga del modelo de IA" />
        )}
        <small>{detalleCarga}</small>
      </div>

      {estadoModelo !== 'LISTO' && (
        <button
          type="button"
          className="cu09-secondary-button"
          disabled={estadoModelo === 'CARGANDO'}
          onClick={() => void cargar()}
        >
          {estadoModelo === 'CARGANDO' ? 'Preparando IA…' : 'Preparar IA local'}
        </button>
      )}

      {instruccionInicial && trazabilidadActiva && (
        <p className="cu09-message info" role="status">
          Orden trasladada desde una conversación. Revisá el texto antes de pulsar «Interpretar y ejecutar».
          No se ejecutó nada al abrir este panel. Al procesarla, el resultado se registrará como
          mensaje del participante en la conversación compartida, sin convertirse en propuesta CU-13.
        </p>
      )}

      <p className="cu09-hybrid-note">
        Las órdenes explícitas de clases, atributos, operaciones sencillas,
        persistencia y relaciones con dirección y multiplicidades cuando correspondan se
        validan directamente. Otras instrucciones utilizan la IA local.
      </p>

      <label className="cu09-input-group">
        Instrucción
        <textarea
          rows={4}
          value={instruccion}
          disabled={!puedeEditar || procesando}
          placeholder="Ej.: Crea la clase Cliente con id Integer y nombre String."
          onChange={(event) => setInstruccion(event.target.value)}
        />
      </label>

      {(contextoPendiente || atributoPendienteLocal) && (
        <div className="cu09-pending">
          <strong>Falta información</strong>
          <span>{contextoPendiente?.pregunta ?? 'Completa los datos solicitados. Escribe "cancelar" para anular.'}</span>
        </div>
      )}

      {!puedeEditar && (
        <div className="cu09-message error">
          Necesitas permiso efectivo de edición para ejecutar acciones del asistente sobre este modelo.
        </div>
      )}

      {mensaje && (
        <div className={`cu09-message ${tipoMensaje.toLowerCase()}`}>
          {mensaje}
        </div>
      )}

      {avisoRegistro && (
        <p className="cu09-message info" role="status">{avisoRegistro}</p>
      )}

      <button
        type="button"
        className="primary-button cu09-run-button"
        disabled={!puedeEditar || procesando || !instruccion.trim()}
        onClick={() => void procesar()}
      >
        {procesando ? 'Interpretando…' : 'Interpretar y ejecutar'}
      </button>

      <p className="cu09-footnote">
        La primera carga necesita descargar el modelo. Las inferencias posteriores se ejecutan en el navegador; la IA propone una intención y la herramienta la valida antes de modificar el UML.
      </p>
    </aside>
  );
}
