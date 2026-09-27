import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/styles/cu01.css';
import { ThemeToggle } from '../shared/theme/ThemeToggle';
import {
  cerrarSesion,
  verificarSesion,
} from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/api/auth.api';
import {
  AUTH_SESSION_CHANGED_EVENT,
  guardarSesion,
  leerSesion,
} from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/storage/auth.storage';
import type {
  AuthSession,
  PerfilUsuario,
} from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/types/auth.types';
import { LoginView } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/views/LoginView';
import { RegistroView } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/views/RegistroView';
import { RecuperarContrasenaView } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/views/RecuperarContrasenaView';
import { PerfilView } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/views/PerfilView';
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

interface WorkspaceViewProps {
  sesion: AuthSession;
  alCerrarSesion: () => Promise<void>;
}

function WorkspaceView({ sesion, alCerrarSesion }: WorkspaceViewProps) {
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
    listarProyectos()
      .then((resultado) => {
        setProyectos(resultado);
        if (resultado.length > 0) {
          setCargando(true);
          setError(null);
          setIdProyecto((actual) => actual ?? resultado[0].id);
        }
      })
      .catch((unknownError: unknown) => setError(mensajeError(unknownError)));
  }, []);

  useEffect(() => {
    if (!idProyecto) {
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
      .catch((unknownError: unknown) => setError(mensajeError(unknownError)))
      .finally(() => setCargando(false));
  }, [idProyecto]);

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
          <Link className="button-link" to="/perfil">
            Mi perfil
          </Link>
          <button type="button" onClick={() => void alCerrarSesion()}>
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
                onClick={() => {
                  if (proyecto.id !== idProyecto) {
                    setCargando(true);
                    setError(null);
                    setIdProyecto(proyecto.id);
                  }
                }}
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

function App() {
  const [sesion, setSesion] = useState<AuthSession | null>(() => leerSesion());

  useEffect(() => {
    const sincronizar = () => setSesion(leerSesion());
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, sincronizar);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, sincronizar);
    };
  }, []);

  useEffect(() => {
    if (!sesion) {
      return;
    }

    void verificarSesion().catch(() => {
      // apiRequest elimina la sesión si el refresh token dejó de ser válido.
      // Una pérdida temporal de red no debe cerrar la sesión local por sí sola.
    });
  }, [sesion]);

  const salir = async () => {
    if (!sesion) {
      return;
    }

    await cerrarSesion(sesion);
    setSesion(null);
    useModeladorStore.setState({ modelo: null, seleccionado: null, sucio: false });
  };

  const actualizarPerfilSesion = (perfil: PerfilUsuario) => {
    if (!sesion) {
      return;
    }

    const actualizada: AuthSession = {
      ...sesion,
      usuario: perfil,
    };

    guardarSesion(actualizada);
    setSesion(actualizada);
  };

  if (!sesion) {
    return (
      <Routes>
        <Route path="/login" element={<LoginView alIniciar={setSesion} />} />
        <Route path="/registro" element={<RegistroView />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasenaView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<WorkspaceView sesion={sesion} alCerrarSesion={salir} />}
      />
      <Route
        path="/perfil"
        element={
          <PerfilView
            sesion={sesion}
            alActualizarPerfil={actualizarPerfilSesion}
            alCerrarSesion={salir}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
