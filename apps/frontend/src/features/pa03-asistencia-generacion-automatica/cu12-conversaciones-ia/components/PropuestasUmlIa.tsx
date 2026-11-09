import type { PropuestaUmlIa } from '../types/conversaciones-ia.types';

interface Props {
  propuestas: PropuestaUmlIa[];
  puedeEditarModelo: boolean;
  rechazando: string | null;
  aplicando: string | null;
  puedeAplicarModelo: boolean;
  onAplicar: (id: string) => void;
  onRechazar: (id: string) => void;
}

export function PropuestasUmlIa({ propuestas, puedeEditarModelo, puedeAplicarModelo, rechazando, aplicando, onRechazar, onAplicar }: Props) {
  return (
    <div className="cu13-propuestas-listado" aria-label="Propuestas sobre el modelo UML">
      {propuestas.map((p) => {
        const pendiente = p.estado === 'PENDIENTE';
        return (
          <article key={p.id} className="cu13-propuesta" aria-label={`Propuesta ${p.id}`}>
            <div className="cu13-propuesta-cabecera">
              <strong>Propuesta UML · v{p.versionModelo}</strong>
              <span className="muted">{p.estado}{!p.vigente && pendiente ? ' · VERSIÓN DESACTUALIZADA' : ''}</span>
            </div>
            <p>{p.datos.resumen}</p>
            {p.datos.clasesNuevas.map((c) => (
              <section key={`clase-${c.nombre}`}>
                <strong>+ Clase {c.nombre}</strong>
                <ul>{c.atributos.map((a) => <li key={a.nombre}>{a.visibilidad} · {a.nombre}: {a.tipo}</li>)}</ul>
              </section>
            ))}
            {p.datos.atributosEnClasesExistentes.map((c) => (
              <section key={`atributos-${c.clase}`}>
                <strong>+ Atributos en {c.clase}</strong>
                <ul>{c.atributos.map((a) => <li key={a.nombre}>{a.visibilidad} · {a.nombre}: {a.tipo}</li>)}</ul>
              </section>
            ))}
            {p.datos.relacionesNuevas.map((r, i) => (
              <section key={`${r.claseOrigen}-${r.claseDestino}-${i}`}>
                <strong>+ {r.tipo}:</strong> {r.claseOrigen} ({r.multiplicidadOrigen ?? '—'}) → {r.claseDestino} ({r.multiplicidadDestino ?? '—'})
              </section>
            ))}
            <div className="cu13-propuesta-acciones">
              {pendiente && puedeEditarModelo && (
                <button type="button" className="primary-button"
                  disabled={!p.vigente || !puedeAplicarModelo || !!aplicando || !!rechazando}
                  title={!p.vigente ? 'Propuesta desactualizada: generá otra sobre la versión actual.' : !puedeAplicarModelo ? 'Esperá a que el modelo colaborativo esté sincronizado.' : 'Aplicar los cambios después de confirmar'}
                  onClick={() => onAplicar(p.id)}>
                  {aplicando === p.id ? 'Aplicando…' : 'Aceptar y aplicar'}
                </button>
              )}
              {pendiente && puedeEditarModelo && (
                <button type="button" disabled={!!rechazando || !!aplicando} onClick={() => onRechazar(p.id)}>
                  {rechazando === p.id ? 'Rechazando…' : 'Rechazar propuesta'}
                </button>
              )}
            </div>
            <small className="muted">{p.estado === 'APLICADA' ? `Aplicada al modelo UML. Versión actual v${p.versionActual}.` : `La vista previa por sí sola no modifica el diagrama. ${p.vigente ? 'Versión vigente al consultar.' : `Versión actual v${p.versionActual}; generá una nueva propuesta para aplicar.`}`}</small>
          </article>
        );
      })}
    </div>
  );
}
