import type { ReactNode } from 'react';
import { ThemeToggle } from '../../../../shared/theme/ThemeToggle';

interface AuthPageProps {
  eyebrow: string;
  titulo: string;
  descripcion: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthPage({
  eyebrow,
  titulo,
  descripcion,
  children,
  footer,
}: AuthPageProps) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-theme-row">
          <ThemeToggle />
        </div>

        <div className="brand-mark">UML</div>
        <div className="eyebrow auth-eyebrow">{eyebrow}</div>
        <h1>{titulo}</h1>
        <p className="muted auth-description">{descripcion}</p>

        {children}

        {footer && <div className="auth-footer">{footer}</div>}
      </section>
    </main>
  );
}
