import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import { ThemeToggle } from '../shared/theme/ThemeToggle';
import { cerrarSesion, iniciarSesion } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/api/auth.api';
import { leerSesion } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/storage/auth.storage';
import type { AuthSession } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/types/auth.types';
import { ModeladorUml } from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/components/ModeladorUml';
import {
  crearModeloUml,
  listarModelosUml,
  obtenerModeloUml,
} from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/api/modelos-uml.api';
import { useModeladorStore } from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/store/modelador.store';
import type { ModeloUmlResumen } from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types';
import {
  listarProyectos,
  obtenerAccesoProyecto,
  type AccesoProyecto,
  type Proyecto,
} from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu02-gestionar-proyecto-colaborativo/api/proyectos.api';

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function LoginView({ alIniciar }: { alIniciar: (sesion: AuthSession) => void }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const sesion = await iniciarSesion({ correo, contrasena });
      alIniciar(sesion);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-theme-row"><ThemeToggle /></div>
        <div className="brand-mark">UML</div>
        <h1>Herramienta CASE colaborativa</h1>
        <p className="muted">
          Accede a tus proyectos para crear y editar diagramas de clases.
        </p>

        <form onSubmit={(event) => void submit(event)}>
          <label>
            Correo
            <input
              type="email"
              value={correo}
              required
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
              autoComplete="current-password"
              onChange={(event) => setContrasena(event.target.value)}
            />
          </label>

          {error && <div className="alert error-alert">{error}</div>}

          <button className="primary-button full-width" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [sesion, setSesion] = useState<AuthSession | null>(() => leerSesion());
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [idProyecto, setIdProyecto] = useState<string | null>(null);
  const [acceso, setAcceso] = useState<AccesoProyecto | null>(null);
  const [modelos, setModelos] = useState<ModeloUmlResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [nombreNuevoModelo, setNombreNuevoModelo] = useState('');
  const modeloAbierto = useModeladorStore((state) => state.modelo);
  const cargarModelo = useModeladorStore((state) => state.cargarModelo);

  useEffect(() => {
    if (!sesion) {
      return;
    }

    listarProyectos()
      .then((resultado) => {
        setProyectos(resultado);
        if (resultado.length > 0) {
          setIdProyecto((actual) => actual ?? resultado[0].id);
        }
      })
      .catch((unknownError: unknown) => setError(mensajeError(unknownError)));
  }, [sesion]);

  useEffect(() => {
    if (!sesion || !idProyecto) {
      return;
    }

    useModeladorStore.setState({ modelo: null, seleccionado: null, sucio: false });

    Promise.all([
      obtenerAccesoProyecto(idProyecto),
      listarModelosUml(idProyecto),
    ])
      .then(([accesoProyecto, modelosProyecto]) => {
        setAcceso(accesoProyecto);
        setModelos(modelosProyecto);
      })
      .catch((unknownError: unknown) => setError(mensajeError(unknownError)));
  }, [sesion, idProyecto]);

  const puedeEditar = useMemo(
    () =>
      acceso?.permisos.some(
        (permiso) =>
          permiso.recurso === 'MODELO' &&
          permiso.accion === 'EDITAR' &&
          permiso.permitido,
      ) ?? false,
    [acceso],
  );

  if (!sesion) {
    return <LoginView alIniciar={setSesion} />;
  }

  const proyectoSeleccionado = proyectos.find(
    (proyecto) => proyecto.id === idProyecto,
  );

  const abrirModelo = async (idModelo: string) => {
    if (!idProyecto) {
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const modelo = await obtenerModeloUml(idProyecto, idModelo);
      cargarModelo(modelo);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setCargando(false);
    }
  };

  const crearModelo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!idProyecto || !nombreNuevoModelo.trim()) {
      return;
    }

    setCreando(true);
    setError(null);

    try {
      const creado = await crearModeloUml(idProyecto, {
        nombre: nombreNuevoModelo.trim(),
      });
      setNombreNuevoModelo('');
      setModelos((actuales) => [creado, ...actuales]);
      cargarModelo(creado);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setCreando(false);
    }
  };

  const salir = async () => {
    await cerrarSesion(sesion);
    setSesion(null);
    setProyectos([]);
    setIdProyecto(null);
    setAcceso(null);
    setModelos([]);
    useModeladorStore.setState({ modelo: null, seleccionado: null, sucio: false });
  };

  if (modeloAbierto && idProyecto) {
    return (
      <ModeladorUml
        idProyecto={idProyecto}
        puedeEditar={puedeEditar}
        alVolver={() => {
          useModeladorStore.setState({
            modelo: null,
            seleccionado: null,
            sucio: false,
          });
          void listarModelosUml(idProyecto).then(setModelos);
        }}
      />
    );
  }

  return (
    <div className="workspace-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">Herramienta CASE</div>
          <h1>Modelado UML</h1>
        </div>
        <div className="header-user">
          <ThemeToggle />
          <span>
            {sesion.usuario.nombre} {sesion.usuario.apellido}
          </span>
          <button type="button" onClick={() => void salir()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="workspace-main">
        <aside className="project-sidebar">
          <h2>Proyectos</h2>
          {proyectos.length === 0 && !cargando && (
            <p className="muted">No tienes proyectos disponibles.</p>
          )}
          <div className="project-list">
            {proyectos.map((proyecto) => (
              <button
                type="button"
                className={proyecto.id === idProyecto ? 'active' : ''}
                key={proyecto.id}
                onClick={() => setIdProyecto(proyecto.id)}
              >
                <strong>{proyecto.nombre}</strong>
                <span>{proyecto.estado}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="models-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Proyecto seleccionado</div>
              <h2>{proyectoSeleccionado?.nombre ?? 'Selecciona un proyecto'}</h2>
              {acceso && (
                <p className="muted">
                  Rol: {acceso.rol.nombre} ·{' '}
                  {puedeEditar ? 'edición habilitada' : 'solo lectura'}
                </p>
              )}
            </div>

            {puedeEditar && idProyecto && (
              <form className="new-model-form" onSubmit={(event) => void crearModelo(event)}>
                <input
                  placeholder="Nombre del nuevo modelo"
                  value={nombreNuevoModelo}
                  maxLength={150}
                  onChange={(event) => setNombreNuevoModelo(event.target.value)}
                />
                <button className="primary-button" disabled={creando}>
                  {creando ? 'Creando…' : '+ Nuevo modelo'}
                </button>
              </form>
            )}
          </div>

          {error && <div className="alert error-alert">{error}</div>}
          {cargando && <div className="alert">Cargando…</div>}

          <div className="model-grid">
            {modelos.map((modelo) => (
              <article className="model-card" key={modelo.id}>
                <div>
                  <span className="version-chip">v{modelo.version}</span>
                  <h3>{modelo.nombre}</h3>
                  <p>{modelo.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="model-card-footer">
                  <span>
                    Actualizado{' '}
                    {new Date(modelo.fechaActualizacion).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void abrirModelo(modelo.id)}
                  >
                    Abrir
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!cargando && idProyecto && modelos.length === 0 && (
            <div className="empty-state">
              <h3>No hay modelos UML en este proyecto</h3>
              <p>
                {puedeEditar
                  ? 'Crea el primer diagrama de clases para comenzar.'
                  : 'No existen modelos disponibles para consultar.'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
