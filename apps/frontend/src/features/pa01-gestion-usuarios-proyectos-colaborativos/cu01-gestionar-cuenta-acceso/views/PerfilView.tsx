import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  cambiarContrasena,
  modificarPerfil,
  obtenerPerfil,
} from '../api/auth.api';
import type {
  AuthSession,
  PerfilUsuario,
} from '../types/auth.types';
import { ThemeToggle } from '../../../../shared/theme/ThemeToggle';

interface PerfilViewProps {
  sesion: AuthSession;
  alActualizarPerfil: (perfil: PerfilUsuario) => void;
  alCerrarSesion: () => Promise<void>;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function PerfilView({
  sesion,
  alActualizarPerfil,
  alCerrarSesion,
}: PerfilViewProps) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [nombre, setNombre] = useState(sesion.usuario.nombre);
  const [apellido, setApellido] = useState(sesion.usuario.apellido);
  const [fotoPerfil, setFotoPerfil] = useState(sesion.usuario.fotoPerfil ?? '');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cambiandoContrasena, setCambiandoContrasena] = useState(false);
  const [mensajeContrasena, setMensajeContrasena] = useState<string | null>(null);
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;

    obtenerPerfil()
      .then((resultado) => {
        if (!activa) {
          return;
        }

        setPerfil(resultado);
        setNombre(resultado.nombre);
        setApellido(resultado.apellido);
        setFotoPerfil(resultado.fotoPerfil ?? '');
      })
      .catch((error: unknown) => {
        if (activa) {
          setErrorPerfil(mensajeError(error));
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

  const guardarPerfil = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGuardando(true);
    setErrorPerfil(null);
    setMensajePerfil(null);

    try {
      const actualizado = await modificarPerfil({
        nombre,
        apellido,
        fotoPerfil: fotoPerfil.trim() || null,
      });
      setPerfil(actualizado);
      setNombre(actualizado.nombre);
      setApellido(actualizado.apellido);
      setFotoPerfil(actualizado.fotoPerfil ?? '');
      alActualizarPerfil(actualizado);
      setMensajePerfil('Perfil actualizado correctamente.');
    } catch (error: unknown) {
      setErrorPerfil(mensajeError(error));
    } finally {
      setGuardando(false);
    }
  };

  const guardarContrasena = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorContrasena(null);
    setMensajeContrasena(null);

    if (nuevaContrasena !== confirmacion) {
      setErrorContrasena('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setCambiandoContrasena(true);

    try {
      const resultado = await cambiarContrasena({
        contrasenaActual,
        nuevaContrasena,
        confirmacionContrasena: confirmacion,
      });
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmacion('');
      setMensajeContrasena(resultado.message);
    } catch (error: unknown) {
      setErrorContrasena(mensajeError(error));
    } finally {
      setCambiandoContrasena(false);
    }
  };

  const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U';

  return (
    <div className="account-page">
      <header className="account-header">
        <div>
          <div className="eyebrow">CU-01 · Cuenta y acceso</div>
          <h1>Mi cuenta</h1>
        </div>
        <div className="account-header-actions">
          <ThemeToggle />
          <Link className="button-link" to="/">
            Volver a proyectos
          </Link>
          <button type="button" onClick={() => void alCerrarSesion()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="account-main">
        <section className="account-summary-card">
          <div className="profile-avatar" aria-hidden="true">
            {fotoPerfil ? <img src={fotoPerfil} alt="" /> : iniciales}
          </div>
          <div>
            <div className="eyebrow">Perfil</div>
            <h2>{nombre} {apellido}</h2>
            <p className="muted">{perfil?.correo ?? sesion.usuario.correo}</p>
          </div>
        </section>

        <div className="account-grid">
          <section className="account-card">
            <div className="account-card-heading">
              <div>
                <h2>Información básica</h2>
                <p className="muted">Actualiza los datos visibles de tu cuenta.</p>
              </div>
            </div>

            {cargando ? (
              <div className="alert">Cargando perfil…</div>
            ) : (
              <form className="account-form" onSubmit={(event) => void guardarPerfil(event)}>
                <div className="auth-grid-2">
                  <label>
                    Nombre
                    <input
                      value={nombre}
                      required
                      maxLength={100}
                      autoComplete="given-name"
                      onChange={(event) => setNombre(event.target.value)}
                    />
                  </label>

                  <label>
                    Apellido
                    <input
                      value={apellido}
                      required
                      maxLength={100}
                      autoComplete="family-name"
                      onChange={(event) => setApellido(event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Correo
                  <input
                    value={perfil?.correo ?? sesion.usuario.correo}
                    disabled
                    aria-describedby="correo-ayuda"
                  />
                  <span id="correo-ayuda" className="field-help">
                    El correo identifica la cuenta y no se modifica desde este flujo.
                  </span>
                </label>

                <label>
                  URL de foto de perfil <span className="optional-label">Opcional</span>
                  <input
                    type="url"
                    value={fotoPerfil}
                    placeholder="https://…"
                    onChange={(event) => setFotoPerfil(event.target.value)}
                  />
                </label>

                {mensajePerfil && (
                  <div className="alert success-alert" role="status">
                    {mensajePerfil}
                  </div>
                )}
                {errorPerfil && (
                  <div className="alert error-alert" role="alert">
                    {errorPerfil}
                  </div>
                )}

                <div className="account-form-actions">
                  <button className="primary-button" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar perfil'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="account-card">
            <div className="account-card-heading">
              <div>
                <h2>Cambiar contraseña</h2>
                <p className="muted">
                  Confirma tu contraseña actual antes de establecer una nueva.
                </p>
              </div>
            </div>

            <form className="account-form" onSubmit={(event) => void guardarContrasena(event)}>
              <label>
                Contraseña actual
                <input
                  type="password"
                  value={contrasenaActual}
                  required
                  autoComplete="current-password"
                  onChange={(event) => setContrasenaActual(event.target.value)}
                />
              </label>

              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={nuevaContrasena}
                  required
                  autoComplete="new-password"
                  onChange={(event) => setNuevaContrasena(event.target.value)}
                />
              </label>

              <label>
                Confirmar nueva contraseña
                <input
                  type="password"
                  value={confirmacion}
                  required
                  autoComplete="new-password"
                  onChange={(event) => setConfirmacion(event.target.value)}
                />
              </label>

              {mensajeContrasena && (
                <div className="alert success-alert" role="status">
                  {mensajeContrasena}
                </div>
              )}
              {errorContrasena && (
                <div className="alert error-alert" role="alert">
                  {errorContrasena}
                </div>
              )}

              <div className="account-form-actions">
                <button className="primary-button" disabled={cambiandoContrasena}>
                  {cambiandoContrasena ? 'Actualizando…' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
