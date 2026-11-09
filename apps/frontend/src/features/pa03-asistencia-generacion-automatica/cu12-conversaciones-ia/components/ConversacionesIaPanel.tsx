import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  archivarConversacionIa,
  crearConversacionIa,
  listarConversacionesIa,
  listarPapeleraConversacionesIa,
  moverConversacionAPapelera,
  restaurarConversacionIa,
} from '../api/conversaciones-ia.api';
import { elegirConversacionInicial, unirConversaciones } from '../helpers/conversaciones-ia.helpers';
import type { ConversacionIa } from '../types/conversaciones-ia.types';
import { HistorialConversacion } from './HistorialConversacion';
import '../styles/cu12.css';

interface Props {
  idProyecto: string;
  nombreProyecto: string;
  idUsuario: string;
  puedeModificar: boolean;
  puedeGestionarPapelera?: boolean;
  onVolver: () => void;
  modo?: 'pagina' | 'diagramador';
  idConversacionInicial?: string | null;
  idModeloAbierto?: string;
  nombreModeloAbierto?: string;
  puedeEditarModelo?: boolean;
  puedeAplicarModelo?: boolean;
  onAplicacionUml?: (estadoYjsBase64: string, version: number) => void;
  onRevisarOrdenUml?: (instruccion: string, idConversacion: string) => void;
  onSeleccionarConversacion?: (id: string) => void;
}

const TAMANO_PAGINA = 50;

function descripcionError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error al consultar las conversaciones.';
}

export function ConversacionesIaPanel({
  idProyecto, nombreProyecto, idUsuario, puedeModificar, puedeGestionarPapelera = false, onVolver,
  modo = 'pagina', idConversacionInicial, onSeleccionarConversacion,
  idModeloAbierto, nombreModeloAbierto, puedeEditarModelo = false, puedeAplicarModelo = false, onAplicacionUml, onRevisarOrdenUml,
}: Props) {
  const [conversaciones, setConversaciones] = useState<ConversacionIa[]>([]);
  const [papelera, setPapelera] = useState<ConversacionIa[]>([]);
  const [mostrandoPapelera, setMostrandoPapelera] = useState(false);
  const [cargandoPapelera, setCargandoPapelera] = useState(false);
  // La preferencia se captura al abrir el panel, no al cambiar la selección.
  const [preferenciaInicial] = useState(idConversacionInicial);
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);
  // Si acaba de crearse, abrir el editor directamente; evita que sus acciones
  // queden fuera de la zona visible hasta volver a elegir la conversación.
  const [idRecienCreada, setIdRecienCreada] = useState<string | null>(null);
  // En el diagramador mostramos un chat o el listado, nunca ambos comprimidos.
  const [vistaDiagramador, setVistaDiagramador] = useState<'chat' | 'lista'>(
    idConversacionInicial ? 'chat' : 'lista',
  );
  const [titulo, setTitulo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const seleccionada = conversaciones.find((item) => item.id === idSeleccionado);

  const refrescar = async () => {
    try {
      const actuales = await listarConversacionesIa(idProyecto, TAMANO_PAGINA);
      setConversaciones(actuales);
      setDesplazamiento(actuales.length);
      setHayMas(actuales.length === TAMANO_PAGINA);
      setError(null);
    } catch (unknownError: unknown) {
      setConversaciones([]);
      setIdSeleccionado(null);
      setError(descripcionError(unknownError));
    }
  };

  useEffect(() => {
    let vigente = true;
    listarConversacionesIa(idProyecto, TAMANO_PAGINA)
      .then((resultado) => {
        if (!vigente) return;
        setConversaciones(resultado);
        setIdSeleccionado(elegirConversacionInicial(resultado, preferenciaInicial));
        setDesplazamiento(resultado.length);
        setHayMas(resultado.length === TAMANO_PAGINA);
      })
      .catch((unknownError: unknown) => {
        if (vigente) setError(descripcionError(unknownError));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [idProyecto, preferenciaInicial]);

  const alternarPapelera = async () => {
    if (!puedeGestionarPapelera || procesando) return;
    if (mostrandoPapelera) {
      setMostrandoPapelera(false);
      setError(null);
      return;
    }
    setCargandoPapelera(true);
    setError(null);
    try {
      const items = await listarPapeleraConversacionesIa(idProyecto);
      setPapelera(items);
      setMostrandoPapelera(true);
      setVistaDiagramador('lista');
    } catch (unknownError: unknown) {
      setError(descripcionError(unknownError));
    } finally {
      setCargandoPapelera(false);
    }
  };

  const moverAPapelera = async () => {
    if (!puedeGestionarPapelera || !seleccionada || procesando) return;
    if (!window.confirm(`¿Mover «${seleccionada.titulo}» a la papelera durante 30 días? Sus mensajes y propuestas se conservarán temporalmente.`)) return;
    setProcesando(true);
    setError(null);
    try {
      const eliminada = await moverConversacionAPapelera(idProyecto, seleccionada.id);
      setConversaciones((actuales) => actuales.filter((c) => c.id !== eliminada.id));
      setPapelera((actuales) => [eliminada, ...actuales.filter((c) => c.id !== eliminada.id)]);
      setIdSeleccionado(null);
      setIdRecienCreada(null);
      setVistaDiagramador('lista');
      setMensaje('Conversación enviada a la papelera. Puede restaurarse antes del vencimiento de los 30 días.');
    } catch (unknownError: unknown) {
      setError(descripcionError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const restaurar = async (chat: ConversacionIa) => {
    if (!puedeGestionarPapelera || procesando) return;
    setProcesando(true);
    setError(null);
    try {
      const restaurada = await restaurarConversacionIa(idProyecto, chat.id);
      setPapelera((actuales) => actuales.filter((c) => c.id !== restaurada.id));
      setConversaciones((actuales) => unirConversaciones(actuales, [restaurada]));
      setIdSeleccionado(restaurada.id);
      setMostrandoPapelera(false);
      setVistaDiagramador('chat');
      onSeleccionarConversacion?.(restaurada.id);
      setMensaje('Conversación restaurada con sus mensajes y propuestas asociados.');
    } catch (unknownError: unknown) {
      setError(descripcionError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const crear = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const limpio = titulo.trim();
    if (!limpio || limpio.length > 200 || procesando) return;
    setProcesando(true);
    setError(null);
    try {
      const creada = await crearConversacionIa(idProyecto, limpio);
      setConversaciones((actuales) => unirConversaciones(actuales, [creada]));
      setIdSeleccionado(creada.id);
      setIdRecienCreada(creada.id);
      setVistaDiagramador('chat');
      onSeleccionarConversacion?.(creada.id);
      setTitulo('');
      setMensaje('Conversación creada y compartida. El editor de mensajes está listo para utilizarse.');
    } catch (unknownError: unknown) {
      setError(descripcionError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const archivar = async () => {
    if (!seleccionada || seleccionada.estado !== 'ACTIVA' || !puedeModificar || procesando) return;
    if (!window.confirm(`¿Archivar la conversación "${seleccionada.titulo}"? No se podrán enviar más mensajes.`)) return;
    setProcesando(true);
    setError(null);
    try {
      const archivada = await archivarConversacionIa(idProyecto, seleccionada.id);
      setConversaciones((actuales) => unirConversaciones(actuales, [archivada]));
      setMensaje('Conversación archivada. El historial sigue disponible en modo lectura.');
    } catch (unknownError: unknown) {
      setError(descripcionError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const cargarMas = async () => {
    if (!hayMas || cargandoMas) return;
    setCargandoMas(true);
    try {
      const pagina = await listarConversacionesIa(idProyecto, TAMANO_PAGINA, desplazamiento);
      setConversaciones((actuales) => unirConversaciones(actuales, pagina));
      setDesplazamiento((actual) => actual + pagina.length);
      setHayMas(pagina.length === TAMANO_PAGINA);
      setError(null);
    } catch (unknownError: unknown) {
      setError(descripcionError(unknownError));
    } finally {
      setCargandoMas(false);
    }
  };

  return (
    <section className={`cu12-panel${modo === 'diagramador' ? ` cu12-panel--diagramador cu12-vista-${vistaDiagramador}` : ''}`}>
      <header className="cu12-encabezado">
        <div>
          <div className="eyebrow">CU-12 · Conversaciones colaborativas</div>
          <h2>{modo === 'diagramador' ? 'Conversaciones' : 'Conversaciones del proyecto'}</h2>
          <p className="muted">{nombreProyecto} · historial compartido entre participantes autorizados</p>
        </div>
        <div className="cu12-acciones">
          {modo === 'diagramador' && (
            <button
              type="button"
              aria-controls="cu12-conversaciones-listado"
              aria-expanded={vistaDiagramador === 'lista'}
              onClick={() => setVistaDiagramador((actual) => actual === 'chat' ? 'lista' : 'chat')}
              disabled={mostrandoPapelera || (vistaDiagramador === 'lista' && !seleccionada)}
            >
              {vistaDiagramador === 'chat'
                ? `Ver conversaciones (${conversaciones.length}${hayMas ? '+' : ''})`
                : 'Volver al chat'}
            </button>
          )}
          {puedeGestionarPapelera && (
            <button type="button" onClick={() => void alternarPapelera()} disabled={procesando || cargandoPapelera}>
              {mostrandoPapelera ? 'Volver a conversaciones' : 'Papelera de chats'}
            </button>
          )}
          <button type="button" onClick={onVolver}>
            {modo === 'diagramador' ? 'Cerrar chat ×' : '← Volver a modelos'}
          </button>
          {modo === 'pagina' && (
            <button type="button" onClick={() => void refrescar()} disabled={cargando || procesando}>Actualizar lista</button>
          )}
        </div>
      </header>

      {error && <div role="alert" className="alert error-alert">{error}</div>}
      {mensaje && <div role="status" className="alert success-alert">{mensaje}</div>}
      {cargando && <div className="alert">Cargando conversaciones…</div>}

      {!cargando && (
        <div className="cu12-distribucion">
          <aside id="cu12-conversaciones-listado" className="cu12-bandeja" aria-label="Conversaciones del proyecto">
            <div className="cu12-lista-cabecera">
              <h3>{mostrandoPapelera ? 'Papelera (30 días)' : 'Conversaciones'}</h3>
              {modo === 'diagramador' && !mostrandoPapelera && (
                <button type="button" onClick={() => void refrescar()} disabled={cargando || procesando}>Actualizar lista</button>
              )}
            </div>
            {!mostrandoPapelera && <form className="cu12-crear" onSubmit={(evento) => void crear(evento)}>
              <label htmlFor="cu12-titulo">Título de la nueva conversación</label>
              <input
                id="cu12-titulo"
                value={titulo}
                maxLength={200}
                placeholder="Ej. Análisis de clases UML"
                onChange={(evento) => setTitulo(evento.target.value)}
              />
              <button className="primary-button" data-cu11-control="crear-conversacion" type="submit" disabled={!titulo.trim() || procesando}>
                {procesando ? 'Procesando…' : '+ Nueva conversación'}
              </button>
            </form>}
            {mostrandoPapelera ? (
              <div className="cu12-papelera-listado" aria-label="Papelera de conversaciones">
                <p className="muted">Solo el Anfitrión puede restaurar chats. Los elementos vencen 30 días después de enviarlos a la papelera.</p>
                {papelera.length === 0 && <p className="muted">La papelera está vacía.</p>}
                {papelera.map((chat) => (
                  <div key={chat.id} className="cu12-papelera-item">
                    <strong>{chat.titulo}</strong>
                    <span className="muted">Restaurable hasta: {chat.fechaPurga ? new Date(chat.fechaPurga).toLocaleString() : '—'}</span>
                    <button type="button" disabled={procesando} onClick={() => void restaurar(chat)}>Restaurar conversación</button>
                  </div>
                ))}
                {papelera.length === 50 && <p className="muted">Se muestran las 50 eliminaciones más recientes.</p>}
              </div>
            ) : <div className="cu12-lista">
              {conversaciones.length === 0 && <p className="muted">Todavía no hay conversaciones en este proyecto.</p>}
              {conversaciones.map((conversacion) => (
                <button
                  type="button"
                  key={conversacion.id}
                  aria-current={conversacion.id === idSeleccionado ? 'true' : undefined}
                  className={`cu12-item ${conversacion.id === idSeleccionado ? 'cu12-item-activo' : ''}`}
                  onClick={() => {
                    setIdSeleccionado(conversacion.id);
                    setIdRecienCreada(null);
                    setVistaDiagramador('chat');
                    onSeleccionarConversacion?.(conversacion.id);
                    setMensaje(null);
                  }}
                >
                  <strong>{conversacion.titulo}</strong>
                  <span>{conversacion.estado === 'ACTIVA' ? 'Activa' : 'Archivada'} · {new Date(conversacion.fechaActualizacion).toLocaleString()}</span>
                </button>
              ))}
              {hayMas && (
                <button type="button" className="cu12-mas" disabled={cargandoMas} onClick={() => void cargarMas()}>
                  {cargandoMas ? 'Cargando…' : 'Mostrar más conversaciones'}
                </button>
              )}
            </div>}
          </aside>
          <div className="cu12-contenido">
            {mostrandoPapelera ? (
              <div className="cu12-sin-seleccion">
                <h3>Papelera de conversaciones</h3>
                <p className="muted">Elegí «Restaurar conversación» en la lista. Mientras un chat permanezca aquí, no podrán leerse sus mensajes ni usarse como contexto de IA.</p>
              </div>
            ) : seleccionada ? (
              <>
                {puedeGestionarPapelera && (
                  <div className="cu12-archivar">
                    <span className="muted">Solo el Anfitrión puede enviar conversaciones a la papelera.</span>
                    <button type="button" disabled={procesando} onClick={() => void moverAPapelera()}>Mover a papelera</button>
                  </div>
                )}
                {puedeModificar && seleccionada.estado === 'ACTIVA' && (
                  <div className="cu12-archivar">
                    <span className="muted">Solo usuarios con permiso de modificación pueden archivar.</span>
                    <button type="button" disabled={procesando} onClick={() => void archivar()}>Archivar conversación</button>
                  </div>
                )}
                <HistorialConversacion
                  key={seleccionada.id}
                  idProyecto={idProyecto}
                  conversacion={seleccionada}
                  idUsuario={idUsuario}
                  idModeloAbierto={modo === 'diagramador' ? idModeloAbierto : undefined}
                  nombreModeloAbierto={modo === 'diagramador' ? nombreModeloAbierto : undefined}
                  puedeEditarModelo={puedeEditarModelo}
                  puedeAplicarModelo={puedeAplicarModelo}
                  onAplicacionUml={onAplicacionUml}
                  onRevisarOrdenUml={modo === 'diagramador' ? onRevisarOrdenUml : undefined}
                  enfocarRedactorAlAbrir={seleccionada.id === idRecienCreada}
                  onRedactorEnfocado={() => setIdRecienCreada(null)}
                  onActividad={() => { void refrescar(); }}
                />
              </>
            ) : (
              <div className="cu12-sin-seleccion">
                <h3>Selecciona una conversación</h3>
                <p className="muted">Puedes consultar el historial compartido o crear una nueva conversación.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {modo === 'pagina' && (
        <p className="cu12-nota">CU-12 conserva los mensajes del equipo; CU-09 responde sólo cuando eliges «Consultar IA». El asistente aún no tiene acceso directo al diagrama UML.</p>
      )}
    </section>
  );
}
