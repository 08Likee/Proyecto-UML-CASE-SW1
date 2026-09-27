import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  confirmarRecuperacion,
  solicitarRecuperacion,
} from '../api/auth.api';
import { AuthPage } from '../components/AuthPage';

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function RecuperarContrasenaView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [correo, setCorreo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const solicitar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviando(true);
    setError(null);
    setMensaje(null);

    try {
      const resultado = await solicitarRecuperacion({ correo });
      setMensaje(resultado.message);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (nuevaContrasena !== confirmacion) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setEnviando(true);

    try {
      await confirmarRecuperacion({
        token,
        nuevaContrasena,
        confirmacionContrasena: confirmacion,
      });
      navigate('/login?recuperacion=ok', { replace: true });
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setEnviando(false);
    }
  };

  if (token) {
    return (
      <AuthPage
        eyebrow="CU-01 · Recuperación"
        titulo="Establecer nueva contraseña"
        descripcion="Completa la recuperación utilizando el enlace de verificación recibido."
        footer={<Link to="/login">Volver a iniciar sesión</Link>}
      >
        <form className="auth-form" onSubmit={(event) => void confirmar(event)}>
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

          {error && (
            <div className="alert error-alert" role="alert">
              {error}
            </div>
          )}

          <button className="primary-button full-width" disabled={enviando}>
            {enviando ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      eyebrow="CU-01 · Recuperación"
      titulo="Recuperar contraseña"
      descripcion="Ingresa el correo de tu cuenta. Si existe, recibirás las instrucciones de recuperación."
      footer={<Link to="/login">Volver a iniciar sesión</Link>}
    >
      <form className="auth-form" onSubmit={(event) => void solicitar(event)}>
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

        {mensaje && (
          <div className="alert success-alert" role="status">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="alert error-alert" role="alert">
            {error}
          </div>
        )}

        <button className="primary-button full-width" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Solicitar recuperación'}
        </button>
      </form>
    </AuthPage>
  );
}
