import { useCallback, useEffect, useState } from "react";
import type { ModeloUmlResumen } from "../../cu05-modelar-diagrama-clases/types/modelo-uml.types";
import {
  descargarModeloXmi,
  validarExportacionXmi,
} from "../api/exportacion-xmi.api";
import type { ResultadoValidacionExportacionXmi } from "../types/exportacion-xmi.types";

interface ExportacionXmiPanelProps {
  idProyecto: string;
  modelo: ModeloUmlResumen;
  onVolver: () => void;
  onAbrirModelo: () => void;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

export function ExportacionXmiPanel({
  idProyecto,
  modelo,
  onVolver,
  onAbrirModelo,
}: ExportacionXmiPanelProps) {
  const [validacion, setValidacion] =
    useState<ResultadoValidacionExportacionXmi | null>(null);
  const [validando, setValidando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const validar = useCallback(async () => {
    setValidando(true);
    setError(null);
    setMensaje(null);

    try {
      const resultado = await validarExportacionXmi(idProyecto, modelo.id);
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

    validarExportacionXmi(idProyecto, modelo.id)
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

  const exportar = async () => {
    if (!validacion?.valido || exportando) {
      return;
    }

    setExportando(true);
    setError(null);
    setMensaje(null);

    try {
      const resultado = await descargarModeloXmi(idProyecto, modelo.id);
      const url = URL.createObjectURL(resultado.blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = resultado.nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      setMensaje(`Modelo exportado correctamente: ${resultado.nombreArchivo}`);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setExportando(false);
    }
  };

  return (
    <section className="export-xmi-panel">
      <div className="export-xmi-header">
        <div>
          <div className="eyebrow">CU-08 · Interoperabilidad UML</div>
          <h2>Exportar a Enterprise Architect</h2>
          <p className="muted">
            Valida el modelo y genera un archivo XMI que conserva las clases,
            atributos, operaciones, relaciones, multiplicidades y disposición
            del diagrama soportado.
          </p>
        </div>
        <div className="export-xmi-actions">
          <button type="button" onClick={onVolver}>
            ← Modelos
          </button>
          <button type="button" onClick={onAbrirModelo}>
            Abrir modelo
          </button>
        </div>
      </div>

      <div className="export-xmi-model-summary">
        <div>
          <span className="export-xmi-summary-label">Modelo seleccionado</span>
          <strong>{modelo.nombre}</strong>
          <span>{modelo.descripcion || "Sin descripción"}</span>
        </div>
        <span className="version-chip">v{modelo.version}</span>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {mensaje && <div className="alert success-alert">{mensaje}</div>}

      <div className="export-xmi-toolbar">
        <div>
          {validando && <span className="muted">Validando exportación…</span>}
          {!validando && validacion && (
            <span
              className={`export-xmi-status ${
                validacion.valido ? "valid" : "invalid"
              }`}
            >
              {validacion.valido
                ? "Modelo válido para exportación"
                : "El modelo requiere correcciones"}
            </span>
          )}
        </div>
        <div className="export-xmi-actions">
          <button
            type="button"
            disabled={validando}
            onClick={() => void validar()}
          >
            {validando ? "Validando…" : "Revalidar"}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!validacion?.valido || validando || exportando}
            onClick={() => void exportar()}
          >
            {exportando ? "Exportando…" : "Exportar y descargar XMI"}
          </button>
        </div>
      </div>

      {validacion && (
        <>
          <div className="export-xmi-format-card">
            <div>
              <span>Formato de intercambio</span>
              <strong>{validacion.formato}</strong>
            </div>
            <div className="export-xmi-counts">
              <span>{validacion.resumen.clases} clases</span>
              <span>{validacion.resumen.atributos} atributos</span>
              <span>{validacion.resumen.operaciones} operaciones</span>
              <span>{validacion.resumen.relaciones} relaciones</span>
            </div>
          </div>

          <div className="export-xmi-validation-grid">
            <section className="export-xmi-validation-card">
              <div className="export-xmi-card-heading">
                <h3>Errores</h3>
                <span>{validacion.errores.length}</span>
              </div>
              {validacion.errores.length === 0 ? (
                <p className="muted">No se detectaron errores bloqueantes.</p>
              ) : (
                <div className="export-xmi-problem-list">
                  {validacion.errores.map((problema, indice) => (
                    <article
                      className="export-xmi-problem export-xmi-problem-error"
                      key={`${problema.codigo}-${problema.elemento ?? "modelo"}-${indice}`}
                    >
                      <strong>{problema.elemento ?? "Modelo UML"}</strong>
                      <p>{problema.mensaje}</p>
                      <code>{problema.codigo}</code>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="export-xmi-validation-card">
              <div className="export-xmi-card-heading">
                <h3>Advertencias</h3>
                <span>{validacion.advertencias.length}</span>
              </div>
              {validacion.advertencias.length === 0 ? (
                <p className="muted">No se detectaron advertencias.</p>
              ) : (
                <div className="export-xmi-problem-list">
                  {validacion.advertencias.map((problema, indice) => (
                    <article
                      className="export-xmi-problem"
                      key={`${problema.codigo}-${problema.elemento ?? "modelo"}-${indice}`}
                    >
                      <strong>{problema.elemento ?? "Modelo UML"}</strong>
                      <p>{problema.mensaje}</p>
                      <code>{problema.codigo}</code>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {validacion && !validacion.valido && (
        <div className="export-xmi-correction-callout">
          <div>
            <strong>Corrige el modelo antes de exportar.</strong>
            <p>
              Abre el diagrama, corrige los elementos indicados y vuelve a
              validar la exportación.
            </p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={onAbrirModelo}
          >
            Corregir en el modelador
          </button>
        </div>
      )}

      <p className="export-xmi-footnote">
        La exportación es de solo lectura: el modelo almacenado en el proyecto
        no se modifica.
      </p>
    </section>
  );
}
