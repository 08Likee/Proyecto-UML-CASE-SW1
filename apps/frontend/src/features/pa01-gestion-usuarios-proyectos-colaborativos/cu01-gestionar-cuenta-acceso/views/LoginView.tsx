import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { iniciarSesion } from '../api/auth.api';
import type { AuthSession } from '../types/auth.types';
import { AuthPage } from '../components/AuthPage';

interface LoginViewProps {
  alIniciar: (sesion: AuthSession) => void;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function LoginView({ alIniciar }: LoginViewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [correo, setCorreo] = useState(() => searchParams.get('correo') ?? '');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const registroCorrecto = searchParams.get('registro') === 'ok';
  const recuperacionCorrecta = searchParams.get('recuperacion') === 'ok';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const sesion = await iniciarSesion({ correo, contrasena });
      alIniciar(sesion);
      navigate('/', { replace: true });
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthPage
      eyebrow="CU-01 · Cuenta y acceso"
      titulo="Iniciar sesión"
      descripcion="Accede a tus proyectos y continúa trabajando con tus modelos UML."
      footer={
        <>
          <span>¿No tienes una cuenta?</span>{' '}
          <Link to="/registro">Crear cuenta</Link>
        </>
      }
    >
      {registroCorrecto && (
        <div className="alert success-alert" role="status">
          Cuenta registrada correctamente. Ya puedes iniciar sesión.
        </div>
      )}

      {recuperacionCorrecta && (
        <div className="alert success-alert" role="status">
          Contraseña actualizada. Inicia sesión con tu nueva contraseña.
        </div>
      )}

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label>
          Correo
          <input
            type="email"
            value={correo}
            required
            autoComplete="email"
            maxLength={254}
            onChange={(event) => setCorreo(event.target.value)}
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={contrasena}
            required
            autoComplete="current-password"
            onChange={(event) => setContrasena(event.target.value)}
          />
        </label>

        <div className="auth-form-links">
          <Link to="/recuperar-contrasena">Olvidé mi contraseña</Link>
        </div>

        {error && (
          <div className="alert error-alert" role="alert">
            {error}
          </div>
        )}

        <button className="primary-button full-width" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthPage>
  );
}
