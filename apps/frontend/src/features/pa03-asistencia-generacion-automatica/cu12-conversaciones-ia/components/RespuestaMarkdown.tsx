import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { esBloqueMermaid, urlExternaSegura } from '../helpers/formato-respuestas.helpers';
import { DiagramaMermaid } from './DiagramaMermaid';

interface Props {
  contenido: string;
}

const componentes: Components = {
  pre({ children }) {
    // React Markdown representa un bloque ```mermaid como <pre><code class="language-mermaid">.
    if (isValidElement<{ className?: string; children?: ReactNode }>(children)
      && esBloqueMermaid(children.props.className)) {
      const codigo = String(children.props.children ?? '').replace(/\n$/, '');
      return <DiagramaMermaid codigo={codigo} />;
    }
    return <pre className="cu12-markdown-codigo">{children}</pre>;
  },
  a({ href, children }) {
    const segura = urlExternaSegura(href);
    return segura
      ? <a href={segura} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
      : <span>{children}</span>;
  },
  // No cargar imágenes externas introducidas por el modelo (privacidad y seguridad).
  img() {
    return null;
  },
};

export function RespuestaMarkdown({ contenido }: Props) {
  return (
    <div className="cu12-markdown">
      <Markdown skipHtml remarkPlugins={[remarkGfm]} components={componentes}>
        {contenido}
      </Markdown>
    </div>
  );
}
