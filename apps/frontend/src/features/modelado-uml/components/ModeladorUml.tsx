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
import { guardarModeloUml } from '../modelos-uml.api';
import { useModeladorStore } from '../modelador.store';
import type {
  ClaseUml,
  MultiplicidadUml,
  RelacionUml,
  TipoRelacionUml,
  VisibilidadUml,
} from '../modelo-uml.types';

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
              <input
                aria-label="Tipo del atributo"
                value={atributo.tipo}
                disabled={!editable}
                onChange={(event) =>
                  actualizarAtributo(clase.id, atributo.id, {
                    tipo: event.target.value,
                  })
                }
              />
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
                  <input
                    aria-label="Tipo del parámetro"
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

  const nodes = useMemo<Node[]>(() => {
    if (!modelo) {
      return [];
    }

    return modelo.contenido.clases.map((clase) => ({
      id: clase.id,
      position: clase.posicion,
      data: { label: <ClaseCard clase={clase} /> },
      style: {
        width: 290,
        padding: 0,
        borderRadius: 6,
      },
    }));
  }, [modelo]);

  const edges = useMemo<Edge[]>(() => {
    if (!modelo) {
      return [];
    }

    return modelo.contenido.relaciones.map((relacion) => ({
      id: relacion.id,
      source: relacion.idClaseOrigen,
      target: relacion.idClaseDestino,
      label: etiquetaRelacion(relacion),
      type: 'smoothstep',
      markerEnd:
        relacion.tipo === 'GENERALIZACION'
          ? { type: MarkerType.ArrowClosed }
          : undefined,
      style: {
        strokeWidth: relacion.tipo === 'COMPOSICION' ? 2.5 : 1.5,
      },
    }));
  }, [modelo]);

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
    if (!puedeEditar || !connection.source || !connection.target) {
      return;
    }

    agregarRelacion(connection.source, connection.target);
  };

  const guardar = async () => {
    if (!puedeEditar || guardando) {
      return;
    }

    setGuardando(true);
    setMensaje(null);

    try {
      const actualizado = await guardarModeloUml(idProyecto, modelo.id, {
        nombre: modelo.nombre,
        descripcion: modelo.descripcion,
        contenido: modelo.contenido,
        version: modelo.version,
      });

      marcarGuardado(actualizado);
      setMensaje(`Guardado. Versión ${actualizado.version}.`);
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
              disabled={!puedeEditar}
              onChange={(event) =>
                actualizarMetadatos(event.target.value, modelo.descripcion)
              }
            />
            <span className="version-chip">v{modelo.version}</span>
          </div>
        </div>

        <div className="toolbar-group">
          {!puedeEditar && <span className="readonly-chip">Solo lectura</span>}
          {sucio && <span className="dirty-chip">Cambios sin guardar</span>}
          {puedeEditar && (
            <button type="button" onClick={agregarClase}>
              + Clase
            </button>
          )}
          {puedeEditar && (
            <button
              className="primary-button"
              type="button"
              disabled={guardando || !sucio}
              onClick={() => void guardar()}
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </div>
      </header>

      {mensaje && <div className="modeler-message">{mensaje}</div>}

      <div className="modeler-main">
        <div className="diagram-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={puedeEditar}
            nodesConnectable={puedeEditar}
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
              {puedeEditar
                ? 'Edita el elemento seleccionado.'
                : 'Consulta del modelo sin permiso de edición.'}
            </p>
          </div>

          <div className="inspector-content model-metadata">
            <label>
              Descripción del modelo
              <textarea
                rows={3}
                value={modelo.descripcion ?? ''}
                disabled={!puedeEditar}
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
            <EditorClase clase={claseSeleccionada} editable={puedeEditar} />
          )}

          {relacionSeleccionada && (
            <EditorRelacion
              relacion={relacionSeleccionada}
              editable={puedeEditar}
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
  );
}
