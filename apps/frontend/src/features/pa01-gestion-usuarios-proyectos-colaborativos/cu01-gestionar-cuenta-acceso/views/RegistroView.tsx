import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registrarCuenta } from '../api/auth.api';
import { AuthPage } from '../components/AuthPage';

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function RegistroView() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (contrasena !== confirmacion) {
      setError('La contraseña y su confirmación no coinciden.');
      return;
    }

    setEnviando(true);

    try {
      await registrarCuenta({ nombre, apellido, correo, contrasena });
      navigate(
        `/login?registro=ok&correo=${encodeURIComponent(correo.trim())}`,
        { replace: true },
      );
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthPage
      eyebrow="CU-01 · Cuenta y acceso"
      titulo="Crear cuenta"
      descripcion="Registra tus datos básicos para comenzar a utilizar la herramienta CASE."
      footer={
        <>
          <span>¿Ya tienes una cuenta?</span>{' '}
          <Link to="/login">Iniciar sesión</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
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
            type="email"
            value={correo}
            required
            maxLength={254}
            autoComplete="email"
            onChange={(event) => setCorreo(event.target.value)}
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={contrasena}
            required
            autoComplete="new-password"
            onChange={(event) => setContrasena(event.target.value)}
          />
        </label>

        <label>
          Confirmar contraseña
          <input
            type="password"
            value={confirmacion}
            required
            autoComplete="new-password"
            onChange={(event) => setConfirmacion(event.target.value)}
          />
        </label>

        {error && (
          <div className="alert error-alert" role="alert">
            {error}
          </div>
        )}

        <button className="primary-button full-width" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthPage>
  );
}
