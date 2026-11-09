import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  codigo: string;
}

const LIMITE_CARACTERES = 12000;
let configurado = false;

/**
 * Mermaid sólo se descarga cuando la respuesta trae un bloque ```mermaid.
 * Se muestra como imagen SVG aislada (no se inserta SVG remoto en el DOM).
 */
export function DiagramaMermaid({ codigo }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const secuencia = useRef(0);
  const [imagen, setImagen] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let activo = true;
    let objetoUrl: string | null = null;

    const dibujar = async () => {
      if (!codigo.trim() || codigo.length > LIMITE_CARACTERES) {
        if (activo) setFallo(true);
        return;
      }
      try {
        const { default: mermaid } = await import('mermaid');
        if (!activo) return;
        if (!configurado) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'neutral',
            maxTextSize: LIMITE_CARACTERES,
            flowchart: { htmlLabels: false },
          });
          configurado = true;
        }
        const { svg } = await mermaid.render(`cu12-diagrama-${id}-${++secuencia.current}`, codigo);
        if (!activo) return;
        // La imagen no admite scripts, enlaces interactivos ni HTML ejecutable.
        objetoUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        setImagen(objetoUrl);
        setFallo(false);
      } catch {
        if (activo) setFallo(true);
      }
    };

    void dibujar();
    return () => {
      activo = false;
      if (objetoUrl) URL.revokeObjectURL(objetoUrl);
    };
  }, [codigo, id]);

  if (fallo) {
    return (
      <div className="cu12-diagrama-error">
        <span className="muted">No se pudo representar el diagrama. Se conserva su definición original:</span>
        <pre className="cu12-markdown-codigo"><code>{codigo}</code></pre>
      </div>
    );
  }

  return (
    <figure className="cu12-diagrama">
      {imagen ? (
        <img src={imagen} alt="Diagrama Mermaid ilustrativo generado por el asistente" loading="lazy" />
      ) : (
        <span className="muted" role="status">Representando diagrama…</span>
      )}
      <figcaption>Diagrama ilustrativo · no modifica el modelo UML del proyecto</figcaption>
    </figure>
  );
}
