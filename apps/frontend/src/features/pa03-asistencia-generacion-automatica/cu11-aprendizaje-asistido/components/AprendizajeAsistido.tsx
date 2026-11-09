import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  condicionDePaso,
  guiaPorId,
  GUIAS_CU11,
  type ContextoAprendizaje,
} from '../domain/guias-aprendizaje';
import {
  claveSenalizacionInicial,
  controlesVisualesDePaso,
  debeOcultarSenalesPorInteraccion,
  DURACION_SENALES_CU11_MS,
  limitarPosicionPanel,
  puedeSenalizarPorPrimeraVez,
  seSuperponenRectangulos,
  ubicarEtiquetaAprendizaje,
  type ControlVisual,
  type RectanguloAprendizaje,
  type UbicacionEtiqueta,
} from '../domain/guias-visuales';
import { ESTADO_APRENDIZAJE_INICIAL } from '../domain/estado-aprendizaje';
import type { EstadoAprendizaje, PosicionAprendizaje } from '../domain/estado-aprendizaje';
import '../styles/cu11.css';

interface Props {
  contexto: ContextoAprendizaje;
  estado: EstadoAprendizaje;
  onCambiar: (estado: EstadoAprendizaje) => void;
}

interface MarcaVisual {
  control: ControlVisual;
  indice: number;
  rect: RectanguloAprendizaje;
  etiqueta: UbicacionEtiqueta | null;
}

/** Prioriza el control visible que no queda detrás del panel de aprendizaje. */
function encontrarControlVisible(id: string): HTMLElement | undefined {
  const elementos = Array.from(document.querySelectorAll<HTMLElement>(`[data-cu11-control="${id}"]`))
    .filter((elemento) => elemento.getClientRects().length > 0);
  const panel = document.getElementById('cu11-panel')?.getBoundingClientRect();
  return elementos.find((elemento) => {
    const rect = elemento.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return false;
    return !panel || !seSuperponenRectangulos(
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      { x: panel.left, y: panel.top, width: panel.width, height: panel.height },
    );
  }) ?? elementos.find((elemento) => {
    const rect = elemento.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }) ?? elementos[0];
}

/** Señalización educativa, sin fondo modal ni capturas de clics del usuario. */
function SenalesAprendizaje({ controles, posicionPanel }: {
  controles: readonly ControlVisual[];
  posicionPanel: PosicionAprendizaje | null;
}) {
  const [marcas, setMarcas] = useState<MarcaVisual[]>([]);

  useEffect(() => {
    let pendiente: number | null = null;
    const actualizar = () => {
      pendiente = null;
      const nuevas: MarcaVisual[] = [];
      const panel = document.getElementById('cu11-panel')?.getBoundingClientRect();
      const rectPanel = panel ? { x: panel.left, y: panel.top, width: panel.width, height: panel.height } : null;
      const ocupadas: RectanguloAprendizaje[] = rectPanel ? [rectPanel] : [];
      const pantalla = { width: window.innerWidth, height: window.innerHeight };
      for (const [indice, control] of controles.entries()) {
        const elemento = encontrarControlVisible(control.id);
        if (!elemento) continue;
        const rect = elemento.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= pantalla.height || rect.right <= 0 || rect.left >= pantalla.width) continue;
        const objetivo = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
        // Un control oculto por la guía no debe dibujar sus marcas encima de ella.
        if (rectPanel && seSuperponenRectangulos(objetivo, rectPanel)) continue;
        const etiqueta = ubicarEtiquetaAprendizaje(
          objetivo, pantalla, ocupadas, Math.min(172, control.titulo.length * 7 + 39),
        );
        if (etiqueta) ocupadas.push(etiqueta);
        nuevas.push({ control, indice, rect: objetivo, etiqueta });
      }
      setMarcas(nuevas);
    };
    const solicitar = () => {
      if (pendiente === null) pendiente = window.requestAnimationFrame(actualizar);
    };
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(solicitar) : null;
    for (const control of controles) {
      const elemento = encontrarControlVisible(control.id);
      if (elemento) observador?.observe(elemento);
    }
    document.addEventListener('scroll', solicitar, true);
    window.addEventListener('resize', solicitar);
    solicitar();
    return () => {
      document.removeEventListener('scroll', solicitar, true);
      window.removeEventListener('resize', solicitar);
      observador?.disconnect();
      if (pendiente !== null) window.cancelAnimationFrame(pendiente);
    };
  }, [controles, posicionPanel]);

  return createPortal(
    <div className="cu11-capa-senales" aria-hidden="true">
      {marcas.map((marca) => (
        <div key={marca.control.id}>
          <div className="cu11-marco-control" style={{ left: marca.rect.x - 3, top: marca.rect.y - 3, width: marca.rect.width + 6, height: marca.rect.height + 6 }} />
          {marca.etiqueta && (
            <span
              className={`cu11-etiqueta-control cu11-etiqueta-${marca.etiqueta.lado}`}
              style={{ left: marca.etiqueta.x, top: marca.etiqueta.y, width: marca.etiqueta.width }}
            >
              <span className="cu11-etiqueta-numero">{marca.indice + 1}</span>
              {marca.control.titulo}
            </span>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function AprendizajeAsistido({ contexto, estado, onCambiar }: Props) {
  const guia = estado.idGuia ? guiaPorId(estado.idGuia) : undefined;
  const paso = guia?.pasos[estado.indicePaso];
  const condicionFaltante = paso ? condicionDePaso(paso, contexto) : null;
  const panelRef = useRef<HTMLElement | null>(null);
  const arrastreRef = useRef<{ id: number; inicioX: number; inicioY: number; posicion: PosicionAprendizaje; ancho: number; alto: number } | null>(null);
  const [senales, setSenales] = useState<{ clave: string; controles: ControlVisual[] } | null>(null);
  const clavePaso = `${estado.idGuia ?? ''}:${estado.indicePaso}:${estado.finalizada}:${estado.abierto}`;
  const senalesActivas = senales?.clave === clavePaso ? senales.controles : null;
  const claveAutomatica = claveSenalizacionInicial(estado.idGuia, estado.indicePaso);

  // Solo la primera visita a un paso autorizado produce un resaltado automático.
  // No desplaza la pantalla, no enfoca campos y jamás ejecuta acciones del producto.
  useEffect(() => {
    if (!estado.abierto || estado.finalizada || !puedeSenalizarPorPrimeraVez(
      paso, condicionFaltante, estado.pasosAutoSenalados.includes(claveAutomatica),
    )) return;
    let pendiente: number | null = null;
    let encontrado = false;
    const intentar = () => {
      pendiente = null;
      if (encontrado || !paso) return;
      const rectPanel = panelRef.current?.getBoundingClientRect();
      const controles = controlesVisualesDePaso(paso).filter((control) => {
        const rect = encontrarControlVisible(control.id)?.getBoundingClientRect();
        if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight
          || rect.right <= 0 || rect.left >= window.innerWidth) return false;
        return !rectPanel || !seSuperponenRectangulos(
          { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
          { x: rectPanel.left, y: rectPanel.top, width: rectPanel.width, height: rectPanel.height },
        );
      });
      if (!controles.length) return;
      encontrado = true;
      setSenales({ clave: clavePaso, controles });
      onCambiar({
        ...estado,
        pasosAutoSenalados: [...estado.pasosAutoSenalados, claveAutomatica],
        aviso: `${controles.length} control(es) localizado(s). Las marcas desaparecen en 5 segundos o al interactuar. Podés volver a mostrarlas con «Localizar control».`,
      });
    };
    const solicitar = () => {
      if (pendiente === null && !encontrado) pendiente = window.requestAnimationFrame(intentar);
    };
    const observador = typeof MutationObserver !== 'undefined' ? new MutationObserver(solicitar) : null;
    observador?.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', solicitar);
    document.addEventListener('scroll', solicitar, true);
    solicitar();
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', solicitar);
      document.removeEventListener('scroll', solicitar, true);
      if (pendiente !== null) window.cancelAnimationFrame(pendiente);
    };
  }, [estado, paso, condicionFaltante, claveAutomatica, clavePaso, onCambiar]);

  // Cada señalización, automática o manual, dura como máximo cinco segundos.
  // Las interacciones reales fuera de la guía la cierran antes; no se interceptan
  // ni se cancelan los eventos del usuario. El cierre no reinicia el paso.
  useEffect(() => {
    if (!senales || senales.clave !== clavePaso || !estado.abierto || condicionFaltante) return;
    const senalizacionActual = senales;
    const ocultar = () => setSenales((actual) => actual === senalizacionActual ? null : actual);
    const alInteractuar = (evento: Event) => {
      const objetivo = evento.target;
      const dentroDelPanel = objetivo instanceof Node && Boolean(panelRef.current?.contains(objetivo));
      const tecla = evento.type === 'keydown' ? (evento as globalThis.KeyboardEvent).key : undefined;
      if (debeOcultarSenalesPorInteraccion(evento.type, dentroDelPanel, tecla)) ocultar();
    };
    const temporizador = window.setTimeout(ocultar, DURACION_SENALES_CU11_MS);
    document.addEventListener('pointerdown', alInteractuar, true);
    document.addEventListener('keydown', alInteractuar, true);
    document.addEventListener('input', alInteractuar, true);
    return () => {
      window.clearTimeout(temporizador);
      document.removeEventListener('pointerdown', alInteractuar, true);
      document.removeEventListener('keydown', alInteractuar, true);
      document.removeEventListener('input', alInteractuar, true);
    };
  }, [senales, clavePaso, estado.abierto, condicionFaltante]);

  // Mantener el panel dentro del área visible al cambiar el tamaño de la ventana.
  useEffect(() => {
    const ajustar = () => {
      if (!estado.posicionPanel || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const nueva = limitarPosicionPanel(estado.posicionPanel, { width: rect.width, height: rect.height }, { width: window.innerWidth, height: window.innerHeight });
      if (nueva.x !== estado.posicionPanel.x || nueva.y !== estado.posicionPanel.y) onCambiar({ ...estado, posicionPanel: nueva });
    };
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [estado, onCambiar]);

  const iniciarArrastre = (evento: PointerEvent<HTMLDivElement>) => {
    if (evento.button !== 0 || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    arrastreRef.current = {
      id: evento.pointerId,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      posicion: { x: rect.left, y: rect.top },
      ancho: rect.width,
      alto: rect.height,
    };
    evento.currentTarget.setPointerCapture(evento.pointerId);
    evento.preventDefault();
  };

  const moverArrastre = (evento: PointerEvent<HTMLDivElement>) => {
    const arrastre = arrastreRef.current;
    if (!arrastre || evento.pointerId !== arrastre.id) return;
    const posicionPanel = limitarPosicionPanel(
      { x: arrastre.posicion.x + evento.clientX - arrastre.inicioX, y: arrastre.posicion.y + evento.clientY - arrastre.inicioY },
      { width: arrastre.ancho, height: arrastre.alto },
      { width: window.innerWidth, height: window.innerHeight },
    );
    onCambiar({ ...estado, posicionPanel });
  };

  const terminarArrastre = (evento: PointerEvent<HTMLDivElement>) => {
    if (arrastreRef.current?.id !== evento.pointerId) return;
    arrastreRef.current = null;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) evento.currentTarget.releasePointerCapture(evento.pointerId);
  };

  const moverTeclado = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    const desplazamientos: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const movimiento = desplazamientos[evento.key];
    if (!movimiento) return;
    evento.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    const distancia = evento.shiftKey ? 40 : 16;
    const posicionPanel = limitarPosicionPanel(
      { x: rect.left + movimiento[0] * distancia, y: rect.top + movimiento[1] * distancia },
      { width: rect.width, height: rect.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
    onCambiar({ ...estado, posicionPanel });
  };

  const seleccionarGuia = (idGuia: string) => {
    setSenales(null);
    onCambiar({ ...estado, abierto: true, idGuia, indicePaso: 0, ayudaVisible: false, finalizada: false, aviso: null, pasosAutoSenalados: [] });
  };

  const avanzar = () => {
    if (!guia || !paso || condicionFaltante) return;
    setSenales(null);
    if (estado.indicePaso === guia.pasos.length - 1) {
      onCambiar({ ...estado, finalizada: true, ayudaVisible: false, aviso: null });
      return;
    }
    onCambiar({ ...estado, indicePaso: estado.indicePaso + 1, ayudaVisible: false, aviso: null });
  };

  const mostrarControl = () => {
    if (!paso || condicionFaltante) return;
    if (senalesActivas) {
      setSenales(null);
      onCambiar({ ...estado, aviso: null });
      return;
    }
    const controles = controlesVisualesDePaso(paso).filter((control) => encontrarControlVisible(control.id));
    if (!controles.length) {
      onCambiar({ ...estado, aviso: 'El control no está visible en esta pantalla. Abrí la sección indicada por el paso y volvé a buscarlo.' });
      return;
    }
    const primero = encontrarControlVisible(controles[0].id);
    primero?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    if (primero?.matches('input, textarea, select')) primero.focus({ preventScroll: true });
    setSenales({ clave: clavePaso, controles });
    onCambiar({ ...estado, aviso: `${controles.length} control(es) localizado(s). Las marcas desaparecen en 5 segundos o al interactuar; no ejecutan acciones.` });
  };

  return (
    <div className="cu11-raiz">
      <button
        type="button"
        className="cu11-activador"
        aria-expanded={estado.abierto}
        aria-controls="cu11-panel"
        onClick={() => { setSenales(null); onCambiar({ ...estado, abierto: !estado.abierto, aviso: null }); }}
      >
        {estado.abierto ? 'Cerrar aprendizaje' : '❔ Aprendizaje'}
      </button>

      {estado.abierto && (
        <aside
          ref={panelRef}
          id="cu11-panel"
          className="cu11-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="cu11-titulo"
          style={estado.posicionPanel ? { left: estado.posicionPanel.x, top: estado.posicionPanel.y, bottom: 'auto' } : undefined}
        >
          <div className="cu11-encabezado">
            <div
              className="cu11-asidero"
              tabIndex={0}
              aria-label="Mover panel de aprendizaje: arrastrar o usar flechas del teclado"
              onPointerDown={iniciarArrastre}
              onPointerMove={moverArrastre}
              onPointerUp={terminarArrastre}
              onPointerCancel={terminarArrastre}
              onKeyDown={moverTeclado}
            >
              <span className="cu11-sobretitulo">CU-11 · Guías interactivas</span>
              <h2 id="cu11-titulo">Aprender a usar la herramienta</h2>
              <span className="cu11-instruccion-mover">⠿ Arrastrá este encabezado para mover la guía (o usá las flechas)</span>
            </div>
            <button type="button" aria-label="Cerrar guía" onClick={() => { setSenales(null); onCambiar({ ...estado, abierto: false, aviso: null }); }}>×</button>
          </div>

          {estado.posicionPanel && <button type="button" className="cu11-restablecer" onClick={() => onCambiar({ ...estado, posicionPanel: null })}>Restablecer posición</button>}

          {!guia && (
            <div className="cu11-lista">
              <p>Elegí un recorrido. Las instrucciones funcionan sin conexión al servicio de IA y no modifican tu proyecto.</p>
              {GUIAS_CU11.map((item) => (
                <button type="button" className="cu11-guia-item" key={item.id} onClick={() => seleccionarGuia(item.id)}>
                  <strong>{item.titulo}</strong>
                  <span>{item.objetivo}</span>
                  <small>{item.pasos.length} pasos</small>
                </button>
              ))}
            </div>
          )}

          {guia && !paso && (
            <div role="alert" className="cu11-advertencia">
              La guía seleccionada no tiene pasos disponibles.
              <button type="button" onClick={() => { setSenales(null); onCambiar({ ...ESTADO_APRENDIZAJE_INICIAL, abierto: true, posicionPanel: estado.posicionPanel }); }}>Elegir otra guía</button>
            </div>
          )}

          {guia && paso && !estado.finalizada && (
            <div className="cu11-recorrido">
              <button type="button" className="cu11-enlace" onClick={() => { setSenales(null); onCambiar({ ...estado, idGuia: null, indicePaso: 0, ayudaVisible: false, aviso: null }); }}>
                ← Todas las guías
              </button>
              <h3>{guia.titulo}</h3>
              <p className="cu11-objetivo">{guia.objetivo}</p>
              <div className="cu11-progreso" aria-label={`Paso ${estado.indicePaso + 1} de ${guia.pasos.length}`}>
                {guia.pasos.map((item, indice) => (
                  <span className={indice <= estado.indicePaso ? 'cu11-progreso-activo' : ''} key={item.titulo} />
                ))}
              </div>
              <p className="cu11-numero">Paso {estado.indicePaso + 1} de {guia.pasos.length}</p>
              <h4>{paso.titulo}</h4>
              <p>{paso.indicacion}</p>
              {condicionFaltante ? (
                <p className="cu11-advertencia" role="status">Condición previa: {condicionFaltante}</p>
              ) : (
                <p className="cu11-correcto">Condiciones de acceso comprobadas para este paso.</p>
              )}
              {estado.ayudaVisible && <p className="cu11-ayuda">{paso.orientacion}</p>}
              {estado.aviso && <p className="cu11-aviso" role="status">{estado.aviso}</p>}
              {senalesActivas && (
                <div className="cu11-leyenda" aria-label="Controles señalados en la pantalla">
                  {senalesActivas.map((control, indice) => (
                    <div className="cu11-leyenda-fila" key={control.id}>
                      <span className="cu11-leyenda-numero">{indice + 1}</span>
                      <span><strong>{control.titulo}</strong> — {control.explicacion}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="cu11-acciones-secundarias">
                <button type="button" onClick={() => onCambiar({ ...estado, ayudaVisible: !estado.ayudaVisible, aviso: null })}>
                  {estado.ayudaVisible ? 'Ocultar explicación' : 'Ayuda contextual'}
                </button>
                {paso.control && (
                  <button type="button" disabled={Boolean(condicionFaltante)} onClick={mostrarControl}>
                    {senalesActivas ? 'Ocultar señalización' : 'Localizar control'}
                  </button>
                )}
              </div>
              <div className="cu11-navegacion">
                <button type="button" disabled={estado.indicePaso === 0} onClick={() => { setSenales(null); onCambiar({ ...estado, indicePaso: estado.indicePaso - 1, ayudaVisible: false, aviso: null }); }}>
                  Anterior
                </button>
                <button type="button" className="primary-button" disabled={Boolean(condicionFaltante)} onClick={avanzar}>
                  {estado.indicePaso === guia.pasos.length - 1 ? 'Finalizar recorrido' : 'Siguiente paso'}
                </button>
              </div>
              <p className="cu11-pie">El avance se confirma manualmente. La guía no ejecuta acciones ni concede permisos.</p>
            </div>
          )}

          {guia && estado.finalizada && (
            <div className="cu11-final">
              <h3>Recorrido finalizado</h3>
              <p>Completaste la guía «{guia.titulo}». Podés continuar con el proyecto o elegir otra función.</p>
              <button type="button" className="primary-button" onClick={() => { setSenales(null); onCambiar({ ...ESTADO_APRENDIZAJE_INICIAL, abierto: true, posicionPanel: estado.posicionPanel }); }}>
                Elegir otra guía
              </button>
              <button type="button" onClick={() => { setSenales(null); onCambiar({ ...estado, abierto: false }); }}>Volver a la herramienta</button>
            </div>
          )}
        </aside>
      )}
      {senalesActivas && !condicionFaltante && <SenalesAprendizaje controles={senalesActivas} posicionPanel={estado.posicionPanel} />}
    </div>
  );
}
