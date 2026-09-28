import { useCallback, useEffect, useState } from 'react';
import type { ModeloUmlResumen } from '../../../pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types';
import {
  descargarBackendGenerado,
  validarGeneracionBackend,
} from '../api/generacion-backend.api';
import type { ResultadoValidacionGeneracion } from '../types/generacion-backend.types';

interface GeneracionBackendPanelProps {
  idProyecto: string;
  modelo: ModeloUmlResumen;
  onVolver: () => void;
  onAbrirModelo: () => void;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function GeneracionBackendPanel({
  idProyecto,
  modelo,
  onVolver,
  onAbrirModelo,
}: GeneracionBackendPanelProps) {
  const [validacion, setValidacion] =
    useState<ResultadoValidacionGeneracion | null>(null);
  const [validando, setValidando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const validar = useCallback(async () => {
    setValidando(true);
    setError(null);
    setMensaje(null);

    try {
      const resultado = await validarGeneracionBackend(idProyecto, modelo.id);
      setValidacion(resultado);
    } catch (unknownError: unknown) {
      setValidacion(null);
      setError(mensajeError(unknownError));
    } finally {
      setValidando(false);
    }
  }, [idProyecto, modelo.id]);

  useEffect(() => {
    let activo = true;

    validarGeneracionBackend(idProyecto, modelo.id)
      .then((resultado) => {
        if (activo) {
          setValidacion(resultado);
        }
      })
      .catch((unknownError: unknown) => {
        if (activo) {
          setValidacion(null);
          setError(mensajeError(unknownError));
        }
      })
      .finally(() => {
        if (activo) {
          setValidando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [idProyecto, modelo.id]);

  const generar = async () => {
    if (!validacion?.valido || generando) {
      return;
    }

    setGenerando(true);
    setError(null);
    setMensaje(null);

    try {
      const resultado = await descargarBackendGenerado(idProyecto, modelo.id);
      const url = URL.createObjectURL(resultado.blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = resultado.nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      setMensaje(`Backend generado correctamente: ${resultado.nombreArchivo}`);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <section className="generation-panel">
      <div className="generation-header">
        <div>
          <div className="eyebrow">CU-10 · Generación automática</div>
          <h2>Generar backend Spring Boot</h2>
          <p className="muted">
            Valida el modelo UML y genera un proyecto con JPA, PostgreSQL, CRUD y
            recursos para Postman.
          </p>
        </div>
        <div className="generation-actions">
          <button type="button" onClick={onVolver}>
            ← Modelos
          </button>
          <button type="button" onClick={onAbrirModelo}>
            Abrir modelo
          </button>
        </div>
      </div>

      <div className="generation-model-summary">
        <div>
          <span className="generation-summary-label">Modelo seleccionado</span>
          <strong>{modelo.nombre}</strong>
          <span>{modelo.descripcion || 'Sin descripción'}</span>
        </div>
        <span className="version-chip">v{modelo.version}</span>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {mensaje && <div className="alert success-alert">{mensaje}</div>}

      <div className="generation-toolbar">
        <div>
          {validando && <span className="muted">Validando modelo…</span>}
          {!validando && validacion && (
            <span
              className={`generation-status ${
                validacion.valido ? 'valid' : 'invalid'
              }`}
            >
              {validacion.valido
                ? 'Modelo válido para generación'
                : 'El modelo requiere correcciones'}
            </span>
          )}
        </div>
        <div className="generation-actions">
          <button type="button" disabled={validando} onClick={() => void validar()}>
            {validando ? 'Validando…' : 'Revalidar'}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!validacion?.valido || validando || generando}
            onClick={() => void generar()}
          >
            {generando ? 'Generando…' : 'Generar y descargar ZIP'}
          </button>
        </div>
      </div>

      {validacion && (
        <div className="generation-validation-grid">
          <section className="generation-validation-card">
            <div className="generation-card-heading">
              <h3>Errores</h3>
              <span>{validacion.errores.length}</span>
            </div>
            {validacion.errores.length === 0 ? (
              <p className="muted">No se detectaron errores bloqueantes.</p>
            ) : (
              <div className="generation-problem-list">
                {validacion.errores.map((problema, indice) => (
                  <article
                    className="generation-problem generation-problem-error"
                    key={`${problema.codigo}-${problema.elemento ?? 'modelo'}-${indice}`}
                  >
                    <strong>{problema.elemento ?? 'Modelo UML'}</strong>
                    <p>{problema.mensaje}</p>
                    <code>{problema.codigo}</code>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="generation-validation-card">
            <div className="generation-card-heading">
              <h3>Advertencias</h3>
              <span>{validacion.advertencias.length}</span>
            </div>
            {validacion.advertencias.length === 0 ? (
              <p className="muted">No se detectaron advertencias.</p>
            ) : (
              <div className="generation-problem-list">
                {validacion.advertencias.map((problema, indice) => (
                  <article
                    className="generation-problem"
                    key={`${problema.codigo}-${problema.elemento ?? 'modelo'}-${indice}`}
                  >
                    <strong>{problema.elemento ?? 'Modelo UML'}</strong>
                    <p>{problema.mensaje}</p>
                    <code>{problema.codigo}</code>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {validacion && validacion.operacionesPendientes.length > 0 && (
        <section className="generation-validation-card generation-pending-card">
          <div className="generation-card-heading">
            <div>
              <h3>Operaciones personalizadas pendientes</h3>
              <p className="muted">
                No bloquean la generación del resto del backend. Podrán completarse
                posteriormente mediante la asistencia definida para el proyecto.
              </p>
            </div>
            <span>{validacion.operacionesPendientes.length}</span>
          </div>
          <div className="generation-problem-list">
            {validacion.operacionesPendientes.map((operacion, indice) => (
              <article
                className="generation-problem"
                key={`${operacion.clase}-${operacion.operacion}-${indice}`}
              >
                <strong>
                  {operacion.clase}.{operacion.operacion}
                </strong>
                <code>{operacion.firma}</code>
                <p>{operacion.motivo}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {validacion && !validacion.valido && (
        <div className="generation-correction-callout">
          <div>
            <strong>Corrige el modelo antes de generar.</strong>
            <p>
              Abre el diagrama, corrige los elementos indicados y vuelve a ejecutar la
              validación.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={onAbrirModelo}>
            Corregir en el modelador
          </button>
        </div>
      )}
    </section>
  );
}
