import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ThemeToggle } from '../../../../shared/theme/ThemeToggle';
import { guardarModeloUml } from '../api/modelos-uml.api';
import { useModeloColaborativo } from '../../cu06-editar-diagrama-colaborativamente/hooks/useModeloColaborativo';
import { useModeladorStore } from '../store/modelador.store';
import type {
  ClaseUml,
  MultiplicidadUml,
  RelacionUml,
  TipoRelacionUml,
  VisibilidadUml,
} from '../types/modelo-uml.types';

const VISIBILIDADES: VisibilidadUml[] = [
  'PUBLICA',
  'PRIVADA',
  'PROTEGIDA',
  'PAQUETE',
];

const MULTIPLICIDADES: MultiplicidadUml[] = [
  '1',
  '0..1',
  '*',
  '0..*',
  '1..*',
];

const TIPOS_RELACION: TipoRelacionUml[] = [
  'ASOCIACION',
  'GENERALIZACION',
  'AGREGACION',
  'COMPOSICION',
];

const TIPOS_DATOS_COMUNES: readonly string[] = [
  'String',
  'Int',
  'Integer',
  'Long',
  'Double',
  'Float',
  'Decimal',
  'Boolean',
  'Date',
  'DateTime',
  'UUID',
] as const;

const SIMBOLO_VISIBILIDAD: Record<VisibilidadUml, string> = {
  PUBLICA: '+',
  PRIVADA: '-',
  PROTEGIDA: '#',
  PAQUETE: '~',
};

function ClaseCard({ clase }: { clase: ClaseUml }) {
  return (
    <div className="uml-class-card">
      <div className="uml-class-name">
        {clase.persistencia.persistente && <span title="Persistente">◉ </span>}
        {clase.nombre}
      </div>

      <div className="uml-class-section">
        {clase.atributos.length === 0 && (
          <span className="uml-empty">sin atributos</span>
        )}
        {clase.atributos.map((atributo) => (
          <div key={atributo.id}>
            {SIMBOLO_VISIBILIDAD[atributo.visibilidad]} {atributo.nombre}:{' '}
            {atributo.tipo}
            {clase.persistencia.idAtributoIdentificador === atributo.id
              ? ' {id}'
              : ''}
          </div>
        ))}
      </div>

      <div className="uml-class-section">
        {clase.operaciones.length === 0 && (
          <span className="uml-empty">sin operaciones</span>
        )}
        {clase.operaciones.map((operacion) => (
          <div key={operacion.id}>
            {SIMBOLO_VISIBILIDAD[operacion.visibilidad]} {operacion.nombre}(
            {operacion.parametros
              .map((parametro) => `${parametro.nombre}: ${parametro.tipo}`)
              .join(', ')}
            ){operacion.tipoRetorno ? `: ${operacion.tipoRetorno}` : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function etiquetaRelacion(relacion: RelacionUml): string {
  const tipo = relacion.tipo.toLowerCase();
  const nombre = relacion.nombre ? ` · ${relacion.nombre}` : '';

  if (relacion.tipo === 'GENERALIZACION') {
    return `«${tipo}»${nombre}`;
  }

  return `${relacion.multiplicidadOrigen ?? ''} «${tipo}»${nombre} ${relacion.multiplicidadDestino ?? ''}`;
}

function EditorClase({ clase, editable }: { clase: ClaseUml; editable: boolean }) {
  const actualizarClase = useModeladorStore((state) => state.actualizarClase);
  const eliminarClase = useModeladorStore((state) => state.eliminarClase);
  const agregarAtributo = useModeladorStore((state) => state.agregarAtributo);
  const actualizarAtributo = useModeladorStore(
    (state) => state.actualizarAtributo,
  );
  const eliminarAtributo = useModeladorStore((state) => state.eliminarAtributo);
  const configurarPersistencia = useModeladorStore(
    (state) => state.configurarPersistencia,
  );
  const agregarOperacion = useModeladorStore((state) => state.agregarOperacion);
  const actualizarOperacion = useModeladorStore(
    (state) => state.actualizarOperacion,
  );
  const eliminarOperacion = useModeladorStore(
    (state) => state.eliminarOperacion,
  );
  const agregarParametro = useModeladorStore((state) => state.agregarParametro);
  const actualizarParametro = useModeladorStore(
    (state) => state.actualizarParametro,
  );
  const eliminarParametro = useModeladorStore(
    (state) => state.eliminarParametro,
  );

  return (
    <div className="inspector-content">
      <h3>Clase</h3>
      <label>
        Nombre
        <input
          value={clase.nombre}
          disabled={!editable}
          onChange={(event) =>
            actualizarClase(clase.id, { nombre: event.target.value })
          }
        />
      </label>

      <section className="inspector-section">
        <div className="inspector-section-title">
          <strong>Atributos</strong>
          {editable && (
            <button type="button" onClick={() => agregarAtributo(clase.id)}>
              + atributo
            </button>
          )}
        </div>

        {clase.atributos.map((atributo) => (
          <div className="editor-row-card" key={atributo.id}>
            <div className="editor-grid-3">
              <input
                aria-label="Nombre del atributo"
                value={atributo.nombre}
                disabled={!editable}
                onChange={(event) =>
                  actualizarAtributo(clase.id, atributo.id, {
                    nombre: event.target.value,
                  })
                }
              />
              <div className="type-input-with-presets">
                <input
                  aria-label="Tipo del atributo"
                  placeholder="Tipo"
                  value={atributo.tipo}
                  disabled={!editable}
                  onChange={(event) =>
                    actualizarAtributo(clase.id, atributo.id, {
                      tipo: event.target.value,
                    })
                  }
                />
                <select
                  aria-label="Tipo común del atributo"
                  value={atributo.tipo}
                  disabled={!editable}
                  onChange={(event) => {
                    if (event.target.value) {
                      actualizarAtributo(clase.id, atributo.id, {
                        tipo: event.target.value,
                      });
                    }
                  }}
                >
                  <option value="" disabled>
                    Tipo
                  </option>
                  {atributo.tipo &&
                    !TIPOS_DATOS_COMUNES.includes(atributo.tipo) && (
                      <option value={atributo.tipo}>{atributo.tipo}</option>
                    )}
                  {TIPOS_DATOS_COMUNES.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
              <select
                aria-label="Visibilidad del atributo"
                value={atributo.visibilidad}
                disabled={!editable}
                onChange={(event) =>
                  actualizarAtributo(clase.id, atributo.id, {
                    visibilidad: event.target.value as VisibilidadUml,
                  })
                }
              >
                {VISIBILIDADES.map((visibilidad) => (
                  <option key={visibilidad} value={visibilidad}>
                    {SIMBOLO_VISIBILIDAD[visibilidad]} {visibilidad}
                  </option>
                ))}
              </select>
            </div>
            {editable && (
              <button
                className="danger-link"
                type="button"
                onClick={() => eliminarAtributo(clase.id, atributo.id)}
              >
                Eliminar atributo
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="inspector-section">
        <strong>Persistencia</strong>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={clase.persistencia.persistente}
            disabled={!editable}
            onChange={(event) =>
              configurarPersistencia(
                clase.id,
                event.target.checked,
                event.target.checked
                  ? clase.persistencia.idAtributoIdentificador
                  : null,
              )
            }
          />
          Clase persistente
        </label>

        {clase.persistencia.persistente && (
          <label>
            Atributo identificador
            <select
              value={clase.persistencia.idAtributoIdentificador ?? ''}
              disabled={!editable}
              onChange={(event) =>
                configurarPersistencia(
                  clase.id,
                  true,
                  event.target.value || null,
                )
              }
            >
              <option value="">Sin seleccionar</option>
              {clase.atributos.map((atributo) => (
                <option key={atributo.id} value={atributo.id}>
                  {atributo.nombre}: {atributo.tipo}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="inspector-section">
        <div className="inspector-section-title">
          <strong>Operaciones</strong>
          {editable && (
            <button type="button" onClick={() => agregarOperacion(clase.id)}>
              + operación
            </button>
          )}
        </div>

        {clase.operaciones.map((operacion) => (
          <div className="editor-row-card" key={operacion.id}>
            <div className="editor-grid-3">
              <input
                aria-label="Nombre de la operación"
                value={operacion.nombre}
                disabled={!editable}
                onChange={(event) =>
                  actualizarOperacion(clase.id, operacion.id, {
                    nombre: event.target.value,
                  })
                }
              />
              <div className="type-input-with-presets">
                <input
                  aria-label="Tipo de retorno"
                  placeholder="retorno (vacío = void)"
                  value={operacion.tipoRetorno ?? ''}
                  disabled={!editable}
                  onChange={(event) =>
                    actualizarOperacion(clase.id, operacion.id, {
                      tipoRetorno: event.target.value || null,
                    })
                  }
                />
                <select
                  aria-label="Tipo de retorno común"
                  value={operacion.tipoRetorno ?? ''}
                  disabled={!editable}
                  onChange={(event) =>
                    actualizarOperacion(clase.id, operacion.id, {
                      tipoRetorno: event.target.value || null,
                    })
                  }
                >
                  <option value="">void</option>
                  {operacion.tipoRetorno &&
                    !TIPOS_DATOS_COMUNES.includes(operacion.tipoRetorno) && (
                      <option value={operacion.tipoRetorno}>
                        {operacion.tipoRetorno}
                      </option>
                    )}
                  {TIPOS_DATOS_COMUNES.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
              <select
                aria-label="Visibilidad de la operación"
                value={operacion.visibilidad}
                disabled={!editable}
                onChange={(event) =>
                  actualizarOperacion(clase.id, operacion.id, {
                    visibilidad: event.target.value as VisibilidadUml,
                  })
                }
              >
                {VISIBILIDADES.map((visibilidad) => (
                  <option key={visibilidad} value={visibilidad}>
                    {SIMBOLO_VISIBILIDAD[visibilidad]} {visibilidad}
                  </option>
                ))}
              </select>
            </div>

            <div className="parameter-list">
              {operacion.parametros.map((parametro) => (
                <div className="parameter-row" key={parametro.id}>
                  <input
                    aria-label="Nombre del parámetro"
                    value={parametro.nombre}
                    disabled={!editable}
                    onChange={(event) =>
                      actualizarParametro(
                        clase.id,
                        operacion.id,
                        parametro.id,
                        { nombre: event.target.value },
                      )
                    }
                  />
                  <div className="type-input-with-presets">
                    <input
                      aria-label="Tipo del parámetro"
                      placeholder="Tipo"
                      value={parametro.tipo}
                      disabled={!editable}
                      onChange={(event) =>
                        actualizarParametro(
                          clase.id,
                          operacion.id,
                          parametro.id,
                          { tipo: event.target.value },
                        )
                      }
                    />
                    <select
                      aria-label="Tipo común del parámetro"
                      value={parametro.tipo}
                      disabled={!editable}
                      onChange={(event) => {
                        if (event.target.value) {
                          actualizarParametro(
                            clase.id,
                            operacion.id,
                            parametro.id,
                            { tipo: event.target.value },
                          );
                        }
                      }}
                    >
                      <option value="" disabled>
                        Tipo
                      </option>
                      {parametro.tipo &&
                        !TIPOS_DATOS_COMUNES.includes(parametro.tipo) && (
                          <option value={parametro.tipo}>{parametro.tipo}</option>
                        )}
                      {TIPOS_DATOS_COMUNES.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      title="Eliminar parámetro"
                      onClick={() =>
                        eliminarParametro(
                          clase.id,
                          operacion.id,
                          parametro.id,
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {editable && (
              <div className="inline-actions">
                <button
                  type="button"
                  onClick={() => agregarParametro(clase.id, operacion.id)}
                >
                  + parámetro
                </button>
                <button
                  className="danger-link"
                  type="button"
                  onClick={() => eliminarOperacion(clase.id, operacion.id)}
                >
                  Eliminar operación
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {editable && (
        <button
          className="danger-button"
          type="button"
          onClick={() => eliminarClase(clase.id)}
        >
          Eliminar clase
        </button>
      )}
    </div>
  );
}

function EditorRelacion({
  relacion,
  editable,
}: {
  relacion: RelacionUml;
  editable: boolean;
}) {
  const cambiarTipoRelacion = useModeladorStore(
    (state) => state.cambiarTipoRelacion,
  );
  const actualizarRelacion = useModeladorStore(
    (state) => state.actualizarRelacion,
  );
  const eliminarRelacion = useModeladorStore(
    (state) => state.eliminarRelacion,
  );

  return (
    <div className="inspector-content">
      <h3>Relación</h3>
      <label>
        Tipo
        <select
          value={relacion.tipo}
          disabled={!editable}
          onChange={(event) =>
            cambiarTipoRelacion(
              relacion.id,
              event.target.value as TipoRelacionUml,
            )
          }
        >
          {TIPOS_RELACION.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </label>

      <label>
        Nombre opcional
        <input
          value={relacion.nombre ?? ''}
          disabled={!editable}
          onChange={(event) =>
            actualizarRelacion(relacion.id, {
              nombre: event.target.value || null,
            })
          }
        />
      </label>

      {relacion.tipo !== 'GENERALIZACION' && (
        <div className="editor-grid-2">
          <label>
            Multiplicidad origen
            <select
              value={relacion.multiplicidadOrigen ?? '1'}
              disabled={!editable}
              onChange={(event) =>
                actualizarRelacion(relacion.id, {
                  multiplicidadOrigen: event.target.value as MultiplicidadUml,
                })
              }
            >
              {MULTIPLICIDADES.map((multiplicidad) => (
                <option key={multiplicidad} value={multiplicidad}>
                  {multiplicidad}
                </option>
              ))}
            </select>
          </label>
          <label>
            Multiplicidad destino
            <select
              value={relacion.multiplicidadDestino ?? '1'}
              disabled={!editable}
              onChange={(event) =>
                actualizarRelacion(relacion.id, {
                  multiplicidadDestino: event.target.value as MultiplicidadUml,
                })
              }
            >
              {MULTIPLICIDADES.map((multiplicidad) => (
                <option key={multiplicidad} value={multiplicidad}>
                  {multiplicidad}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {editable && (
        <button
          className="danger-button"
          type="button"
          onClick={() => eliminarRelacion(relacion.id)}
        >
          Eliminar relación
        </button>
      )}
    </div>
  );
}

export interface ModeladorUmlProps {
  idProyecto: string;
  puedeEditar: boolean;
  alVolver: () => void;
}

export function ModeladorUml({
  idProyecto,
  puedeEditar,
  alVolver,
}: ModeladorUmlProps) {
  const modelo = useModeladorStore((state) => state.modelo);
  const seleccionado = useModeladorStore((state) => state.seleccionado);
  const sucio = useModeladorStore((state) => state.sucio);
  const seleccionar = useModeladorStore((state) => state.seleccionar);
  const agregarClase = useModeladorStore((state) => state.agregarClase);
  const moverClase = useModeladorStore((state) => state.moverClase);
  const agregarRelacion = useModeladorStore((state) => state.agregarRelacion);
  const actualizarMetadatos = useModeladorStore(
    (state) => state.actualizarMetadatos,
  );
  const marcarGuardado = useModeladorStore((state) => state.marcarGuardado);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const colaboracion = useModeloColaborativo({
    idProyecto,
    idModelo: modelo?.id ?? '',
    puedeEditarInicial: puedeEditar,
  });
  const puedeEditarEfectivo =
    puedeEditar && colaboracion.puedeEditar && colaboracion.listo;

  const nodes = useMemo<Node[]>(() => {
    if (!modelo) {
      return [];
    }

    return modelo.contenido.clases.map((clase) => ({
      id: clase.id,
      position: clase.posicion,
      data: { label: <ClaseCard clase={clase} /> },
      selected:
        seleccionado?.tipo === 'CLASE' && seleccionado.id === clase.id,
      style: {
        width: 290,
        padding: 0,
        borderRadius: 6,
      },
    }));
  }, [modelo, seleccionado]);

  const edges = useMemo<Edge[]>(() => {
    if (!modelo) {
      return [];
    }

    return modelo.contenido.relaciones.map((relacion) => ({
      id: relacion.id,
      source: relacion.idClaseOrigen,
      target: relacion.idClaseDestino,
      label: etiquetaRelacion(relacion),
      selected:
        seleccionado?.tipo === 'RELACION' && seleccionado.id === relacion.id,
      type: 'smoothstep',
      markerEnd:
        relacion.tipo === 'GENERALIZACION'
          ? { type: MarkerType.ArrowClosed }
          : undefined,
      style: {
        strokeWidth: relacion.tipo === 'COMPOSICION' ? 2.5 : 1.5,
      },
    }));
  }, [modelo, seleccionado]);

  if (!modelo) {
    return null;
  }

  const claseSeleccionada =
    seleccionado?.tipo === 'CLASE'
      ? modelo.contenido.clases.find(
          (clase) => clase.id === seleccionado.id,
        ) ?? null
      : null;

  const relacionSeleccionada =
    seleccionado?.tipo === 'RELACION'
      ? modelo.contenido.relaciones.find(
          (relacion) => relacion.id === seleccionado.id,
        ) ?? null
      : null;

  const conectar = (connection: Connection) => {
    if (!puedeEditarEfectivo || !connection.source || !connection.target) {
      return;
    }

    agregarRelacion(connection.source, connection.target);
  };

  const guardar = async () => {
    if (!puedeEditarEfectivo || guardando) {
      return;
    }

    setGuardando(true);
    setMensaje(null);

    try {
      const versionVigente = await colaboracion.prepararGuardadoManual();
      const actualizado = await guardarModeloUml(idProyecto, modelo.id, {
        nombre: modelo.nombre,
        descripcion: modelo.descripcion,
        contenido: modelo.contenido,
        version: versionVigente,
      });

      marcarGuardado(actualizado);
      colaboracion.registrarGuardadoRest();
      setMensaje(`Metadatos guardados. Versión ${actualizado.version}.`);
    } catch (error: unknown) {
      setMensaje(
        error instanceof Error ? error.message : 'No se pudo guardar el modelo',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modeler-shell">
      <header className="modeler-toolbar">
        <div className="toolbar-group">
          <button type="button" onClick={alVolver}>
            ← Modelos
          </button>
          <div>
            <input
              className="model-name-input"
              value={modelo.nombre}
              disabled={!puedeEditarEfectivo}
              onChange={(event) =>
                actualizarMetadatos(event.target.value, modelo.descripcion)
              }
            />
            <span className="version-chip">v{modelo.version}</span>
          </div>
        </div>

        <div className="toolbar-group">
          <span
            className={`collaboration-status ${
              colaboracion.conexion === 'conectado'
                ? 'online'
                : colaboracion.conexion === 'conectando'
                  ? 'connecting'
                  : 'offline'
            }`}
          >
            <span className="collaboration-status-dot" />
            {colaboracion.conexion === 'conectado'
              ? colaboracion.sincronizado
                ? 'Sincronizado'
                : 'Conectado'
              : colaboracion.conexion === 'conectando'
                ? 'Conectando…'
                : colaboracion.modoOffline
                  ? 'Offline · copia local'
                  : 'Sin conexión'}
          </span>
          <span className="collaboration-participants">
            {colaboracion.participantes} participante
            {colaboracion.participantes === 1 ? '' : 's'}
          </span>
          <ThemeToggle />
          {!puedeEditarEfectivo && colaboracion.listo && (
            <span className="readonly-chip">Solo lectura</span>
          )}
          {sucio && (
            <span className="dirty-chip">Metadatos sin guardar</span>
          )}
          {puedeEditarEfectivo && (
            <button type="button" onClick={agregarClase}>
              + Clase
            </button>
          )}
          {puedeEditarEfectivo && sucio && (
            <button
              className="primary-button"
              type="button"
              disabled={guardando || !sucio}
              onClick={() => void guardar()}
            >
              {guardando ? 'Guardando…' : 'Guardar metadatos'}
            </button>
          )}
        </div>
      </header>

      <div className="modeler-content">
        <div className="modeler-notifications">
          {colaboracion.error && (
            <div className="collaboration-banner error">
              {colaboracion.error}
            </div>
          )}
          {!colaboracion.listo && !colaboracion.error && (
            <div className="collaboration-banner">
              Preparando el documento colaborativo…
            </div>
          )}
          {colaboracion.modoOffline && (
            <div className="collaboration-banner">
              Sin conexión al servidor colaborativo. Los cambios válidos se conservan
              localmente y se sincronizarán al recuperar la conexión.
            </div>
          )}
          {mensaje && <div className="modeler-message">{mensaje}</div>}
        </div>

        <div className="modeler-main">
        <div className="diagram-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={puedeEditarEfectivo}
            nodesConnectable={puedeEditarEfectivo}
            onConnect={conectar}
            onNodeClick={(_, node) =>
              seleccionar({ tipo: 'CLASE', id: node.id })
            }
            onEdgeClick={(_, edge) =>
              seleccionar({ tipo: 'RELACION', id: edge.id })
            }
            onPaneClick={() => seleccionar(null)}
            onNodeDragStop={(_, node) =>
              moverClase(node.id, node.position.x, node.position.y)
            }
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>

        <aside className="inspector">
          <div className="inspector-header">
            <h2>Propiedades</h2>
            <p>
              {puedeEditarEfectivo
                ? 'Edita el elemento seleccionado. Los cambios del diagrama se sincronizan automáticamente.'
                : 'Consulta del modelo sin permiso de edición.'}
            </p>
          </div>

          <div className="inspector-content model-metadata">
            <label>
              Descripción del modelo
              <textarea
                rows={3}
                value={modelo.descripcion ?? ''}
                disabled={!puedeEditarEfectivo}
                onChange={(event) =>
                  actualizarMetadatos(
                    modelo.nombre,
                    event.target.value || null,
                  )
                }
              />
            </label>
          </div>

          {claseSeleccionada && (
            <EditorClase clase={claseSeleccionada} editable={puedeEditarEfectivo} />
          )}

          {relacionSeleccionada && (
            <EditorRelacion
              relacion={relacionSeleccionada}
              editable={puedeEditarEfectivo}
            />
          )}

          {!claseSeleccionada && !relacionSeleccionada && (
            <div className="inspector-placeholder">
              Selecciona una clase o una relación. Para crear una relación, arrastra
              desde el conector de una clase hacia otra.
            </div>
          )}
        </aside>
        </div>
      </div>
    </div>
  );
}
