import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ThemeToggle } from '../../../../shared/theme/ThemeToggle';
import {
  aceptarInvitacion,
  listarInvitaciones,
  rechazarInvitacion,
  type InvitacionRecibida,
} from '../api/invitaciones.api';

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function formatearFecha(valor: string): string {
  return new Date(valor).toLocaleString();
}

export function InvitacionesView() {
  const [invitaciones, setInvitaciones] = useState<InvitacionRecibida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;

    listarInvitaciones()
      .then((resultado) => {
        if (activa) {
          setInvitaciones(resultado);
        }
      })
      .catch((unknownError: unknown) => {
        if (activa) {
          setError(mensajeError(unknownError));
        }
      })
      .finally(() => {
        if (activa) {
          setCargando(false);
        }
      });

    return () => {
      activa = false;
    };
  }, []);

  const aceptar = async (invitacion: InvitacionRecibida) => {
    setProcesandoId(invitacion.id);
    setError(null);
    setMensaje(null);

    try {
      await aceptarInvitacion(invitacion.id);
      setInvitaciones((actuales) =>
        actuales.filter((item) => item.id !== invitacion.id),
      );
      setMensaje(
        `Te incorporaste a ${invitacion.proyectoNombre} con el rol ${invitacion.rolNombre}.`,
      );
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesandoId(null);
    }
  };

  const rechazar = async (invitacion: InvitacionRecibida) => {
    const confirmado = window.confirm(
      `¿Rechazar la invitación al proyecto “${invitacion.proyectoNombre}”?`,
    );

    if (!confirmado) {
      return;
    }

    setProcesandoId(invitacion.id);
    setError(null);
    setMensaje(null);

    try {
      await rechazarInvitacion(invitacion.id);
      setInvitaciones((actuales) =>
        actuales.filter((item) => item.id !== invitacion.id),
      );
      setMensaje(
        `La invitación a ${invitacion.proyectoNombre} fue rechazada.`,
      );
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="invitations-page">
      <header className="invitations-header">
        <div>
          <div className="eyebrow">CU-04 · Acceso colaborativo</div>
          <h1>Invitaciones</h1>
          <p>
            Revisa los proyectos que te invitaron a integrar y el rol que recibirás
            antes de decidir.
          </p>
        </div>

        <div className="invitations-header-actions">
          <ThemeToggle />
          <Link className="button-link" to="/">
            Volver a proyectos
          </Link>
        </div>
      </header>

      <main className="invitations-main">
        {error && <div className="alert error-alert">{error}</div>}
        {mensaje && (
          <div className="alert success-alert invitations-success">
            <span>{mensaje}</span>
            <Link to="/">Ir a mis proyectos</Link>
          </div>
        )}
        {cargando && <div className="alert">Cargando invitaciones…</div>}

        {!cargando && invitaciones.length === 0 && (
          <section className="invitations-empty">
            <div className="invitations-empty-icon">✓</div>
            <h2>No tienes invitaciones pendientes</h2>
            <p>
              Cuando un Anfitrión te invite a un proyecto, aparecerá aquí con el
              rol que recibirás al aceptar.
            </p>
            <Link className="button-link primary-button" to="/">
              Volver a mis proyectos
            </Link>
          </section>
        )}

        <div className="invitations-grid">
          {invitaciones.map((invitacion) => {
            const procesando = procesandoId === invitacion.id;

            return (
              <article className="invitation-card" key={invitacion.id}>
                <div className="invitation-card-heading">
                  <div>
                    <span className="invitation-status">{invitacion.estado}</span>
                    <h2>{invitacion.proyectoNombre}</h2>
                  </div>
                  <div className="invitation-role">
                    <span>Rol asignado</span>
                    <strong>{invitacion.rolNombre}</strong>
                  </div>
                </div>

                <div className="invitation-dates">
                  <div>
                    <span>Recibida</span>
                    <strong>{formatearFecha(invitacion.fechaCreacion)}</strong>
                  </div>
                  <div>
                    <span>Vence</span>
                    <strong>{formatearFecha(invitacion.fechaExpiracion)}</strong>
                  </div>
                </div>

                <p className="invitation-help">
                  Si aceptas, se creará tu membresía en el proyecto con el rol
                  indicado. Las acciones disponibles dependerán de sus permisos.
                </p>

                <div className="invitation-actions">
                  <button
                    type="button"
                    className="danger-button"
                    disabled={procesando}
                    onClick={() => void rechazar(invitacion)}
                  >
                    {procesando ? 'Procesando…' : 'Rechazar'}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={procesando}
                    onClick={() => void aceptar(invitacion)}
                  >
                    {procesando ? 'Procesando…' : 'Aceptar invitación'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
