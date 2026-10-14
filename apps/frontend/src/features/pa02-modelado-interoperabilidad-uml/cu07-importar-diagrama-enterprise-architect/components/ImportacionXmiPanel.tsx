import { useState } from 'react';
import { importarModeloXmi, validarImportacionXmi } from '../api/importacion-xmi.api';
import type {
  ModeloImportadoXmi,
  ResultadoValidacionImportacionXmi,
} from '../types/importacion-xmi.types';

interface ImportacionXmiPanelProps {
  idProyecto: string;
  onVolver: () => void;
  onImportado: (modelo: ModeloImportadoXmi) => void;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function ImportacionXmiPanel({
  idProyecto,
  onVolver,
  onImportado,
}: ImportacionXmiPanelProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombre, setNombre] = useState('');
  const [validacion, setValidacion] =
    useState<ResultadoValidacionImportacionXmi | null>(null);
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seleccionarArchivo = (nuevo: File | null) => {
    setArchivo(nuevo);
    setValidacion(null);
    setError(null);
    if (!nuevo) setNombre('');
  };

  const validar = async () => {
    if (!archivo || validando) return;
    setValidando(true);
    setError(null);
    try {
      const resultado = await validarImportacionXmi(idProyecto, archivo);
      setValidacion(resultado);
      if (!nombre.trim()) setNombre(resultado.nombreSugerido);
    } catch (unknownError: unknown) {
      setValidacion(null);
      setError(mensajeError(unknownError));
    } finally {
      setValidando(false);
    }
  };

  const importar = async () => {
    if (!archivo || !validacion?.valido || importando) return;
    setImportando(true);
    setError(null);
    try {
      const modelo = await importarModeloXmi(idProyecto, archivo, nombre);
      onImportado(modelo);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setImportando(false);
    }
  };

  return (
    <section className="import-xmi-panel">
      <div className="import-xmi-header">
        <div>
          <div className="eyebrow">CU-07 · Interoperabilidad UML</div>
          <h2>Importar desde Enterprise Architect</h2>
          <p className="muted">
            Selecciona un XMI exportado desde Enterprise Architect. El sistema
            valida primero las clases, atributos, operaciones, relaciones,
            multiplicidades y disposición compatibles antes de incorporarlo.
          </p>
        </div>
        <button type="button" onClick={onVolver}>← Modelos</button>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      <div className="import-xmi-file-card">
        <label>
          <span>Archivo XMI</span>
          <input
            type="file"
            accept=".xmi,.xml,application/xml,text/xml"
            onChange={(event) => seleccionarArchivo(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="import-xmi-file-meta">
          <strong>{archivo?.name ?? 'Ningún archivo seleccionado'}</strong>
          {archivo && <span>{(archivo.size / 1024).toFixed(1)} KiB · máximo 5 MiB</span>}
        </div>
        <button
          type="button"
          disabled={!archivo || validando || importando}
          onClick={() => void validar()}
        >
          {validando ? 'Validando…' : 'Validar XMI'}
        </button>
      </div>

      {validacion && (
        <>
          <div className={`import-xmi-status ${validacion.valido ? 'valid' : 'invalid'}`}>
            <strong>{validacion.valido ? 'Archivo compatible' : 'Importación bloqueada'}</strong>
            <span>{validacion.formato}</span>
          </div>

          <div className="import-xmi-counts">
            <span>{validacion.resumen.clases} clases</span>
            <span>{validacion.resumen.atributos} atributos</span>
            <span>{validacion.resumen.operaciones} operaciones</span>
            <span>{validacion.resumen.relaciones} relaciones</span>
          </div>

          <div className="import-xmi-validation-grid">
            <section className="import-xmi-validation-card">
              <div className="import-xmi-card-heading">
                <h3>Errores</h3><span>{validacion.errores.length}</span>
              </div>
              {validacion.errores.length === 0 ? (
                <p className="muted">No se detectaron errores bloqueantes.</p>
              ) : (
                validacion.errores.map((actual, indice) => (
                  <article className="import-xmi-problem error" key={`${actual.codigo}-${indice}`}>
                    <strong>{actual.elemento ?? 'Archivo XMI'}</strong>
                    <p>{actual.mensaje}</p><code>{actual.codigo}</code>
                  </article>
                ))
              )}
            </section>

            <section className="import-xmi-validation-card">
              <div className="import-xmi-card-heading">
                <h3>Advertencias</h3><span>{validacion.advertencias.length}</span>
              </div>
              {validacion.advertencias.length === 0 ? (
                <p className="muted">No se detectaron advertencias.</p>
              ) : (
                validacion.advertencias.map((actual, indice) => (
                  <article className="import-xmi-problem" key={`${actual.codigo}-${indice}`}>
                    <strong>{actual.elemento ?? 'Archivo XMI'}</strong>
                    <p>{actual.mensaje}</p><code>{actual.codigo}</code>
                  </article>
                ))
              )}
            </section>
          </div>

          {validacion.valido && (
            <div className="import-xmi-confirm-card">
              <label>
                <span>Nombre del modelo importado</span>
                <input
                  value={nombre}
                  maxLength={150}
                  required
                  onChange={(event) => setNombre(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="primary-button"
                disabled={!nombre.trim() || importando}
                onClick={() => void importar()}
              >
                {importando ? 'Importando…' : 'Importar y abrir modelo'}
              </button>
            </div>
          )}
        </>
      )}

      <p className="import-xmi-footnote">
        La importación crea un modelo nuevo; no reemplaza ni modifica modelos existentes.
      </p>
    </section>
  );
}
