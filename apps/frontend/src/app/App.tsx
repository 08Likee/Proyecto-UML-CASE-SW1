import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/styles/cu01.css';
import '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu02-gestionar-proyecto-colaborativo/styles/cu02.css';
import '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu03-gestionar-participantes-roles/styles/cu03.css';
import '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu04-acceder-proyecto-colaborativo/styles/cu04.css';
import '../features/pa02-modelado-interoperabilidad-uml/cu06-editar-diagrama-colaborativamente/styles/cu06.css';
import '../features/pa02-modelado-interoperabilidad-uml/cu07-importar-diagrama-enterprise-architect/styles/cu07.css';
import '../features/pa02-modelado-interoperabilidad-uml/cu08-exportar-diagrama-enterprise-architect/styles/cu08.css';
import '../features/pa03-asistencia-generacion-automatica/cu10-generar-backend/styles/cu10.css';
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
import { ProyectoDetalle } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu02-gestionar-proyecto-colaborativo/components/ProyectoDetalle';
import { GestionParticipantes } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu03-gestionar-participantes-roles/components/GestionParticipantes';
import { InvitacionesView } from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu04-acceder-proyecto-colaborativo/views/InvitacionesView';
import {
  ProyectoForm,
  type ProyectoFormValores,
} from '../features/pa01-gestion-usuarios-proyectos-colaborativos/cu02-gestionar-proyecto-colaborativo/components/ProyectoForm';
import { ModeladorUml } from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/components/ModeladorUml';
import {
  crearModeloUml,
  listarModelosUml,
  listarModelosUmlPapelera,
  moverModeloUmlPapelera,
  restaurarModeloUmlPapelera,
  type ModeloUmlPapelera,
  obtenerModeloUml,
} from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/api/modelos-uml.api';
import { useModeladorStore } from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/store/modelador.store';
import type { ModeloUmlResumen } from '../features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types';
import { GeneracionBackendPanel } from '../features/pa03-asistencia-generacion-automatica/cu10-generar-backend/components/GeneracionBackendPanel';
import { ConversacionesIaPanel } from '../features/pa03-asistencia-generacion-automatica/cu12-conversaciones-ia/components/ConversacionesIaPanel';
import { AprendizajeAsistido } from '../features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/components/AprendizajeAsistido';
import { ESTADO_APRENDIZAJE_INICIAL } from '../features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/estado-aprendizaje';
import type { EstadoAprendizaje } from '../features/pa03-asistencia-generacion-automatica/cu11-aprendizaje-asistido/domain/estado-aprendizaje';
import { ExportacionXmiPanel } from '../features/pa02-modelado-interoperabilidad-uml/cu08-exportar-diagrama-enterprise-architect/components/ExportacionXmiPanel';
import { ImportacionXmiPanel } from '../features/pa02-modelado-interoperabilidad-uml/cu07-importar-diagrama-enterprise-architect/components/ImportacionXmiPanel';
import {
  crearProyecto as crearProyectoApi,
  listarProyectos,
  listarProyectosPapelera,
  moverProyectoPapelera,
  restaurarProyectoPapelera,
  type ElementoPapelera,
  modificarProyecto as modificarProyectoApi,
  obtenerAccesoProyecto,
  obtenerProyecto,
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
  const [estadoAprendizaje, setEstadoAprendizaje] = useState<EstadoAprendizaje>(ESTADO_APRENDIZAJE_INICIAL);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectosPapelera, setProyectosPapelera] = useState<ElementoPapelera[]>([]);
  const [modelosPapelera, setModelosPapelera] = useState<ModeloUmlPapelera[]>([]);
  const [mostrarPapeleraModelos, setMostrarPapeleraModelos] = useState(false);
  const [operandoPapelera, setOperandoPapelera] = useState(false);
  const [idProyecto, setIdProyecto] = useState<string | null>(null);
  const [acceso, setAcceso] = useState<AccesoProyecto | null>(null);
  const [modelos, setModelos] = useState<ModeloUmlResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [nombreNuevoModelo, setNombreNuevoModelo] = useState('');
  const [modeloGeneracion, setModeloGeneracion] = useState<ModeloUmlResumen | null>(null);
  const [modeloExportacion, setModeloExportacion] = useState<ModeloUmlResumen | null>(null);
  const [modoProyecto, setModoProyecto] = useState<
    'detalle' | 'crear' | 'editar' | 'administrar' | 'generar' | 'importar' | 'exportar' | 'conversaciones' | 'papeleraProyectos'
  >('detalle');
  const [guardandoProyecto, setGuardandoProyecto] = useState(false);
  const [mensajeProyecto, setMensajeProyecto] = useState<string | null>(null);
  const modeloAbierto = useModeladorStore((state) => state.modelo);
  const cargarModelo = useModeladorStore((state) => state.cargarModelo);

  useEffect(() => {
    void listarProyectosPapelera().then(setProyectosPapelera).catch(() => setProyectosPapelera([]));
    listarProyectos()
      .then((resultado) => {
        setProyectos(resultado);
        if (resultado.length > 0) {
          setCargando(true);
          setError(null);
          setIdProyecto((actual) => actual ?? resultado[0].id);
          return;
        }

        setIdProyecto(null);
        setAcceso(null);
        setModelos([]);
      })
      .catch((unknownError: unknown) => setError(mensajeError(unknownError)));
  }, []);

  useEffect(() => {
    if (!idProyecto) {
      return;
    }

    useModeladorStore.setState({ modelo: null, seleccionado: null, sucio: false });

    Promise.all([
      obtenerProyecto(idProyecto),
      obtenerAccesoProyecto(idProyecto),
      listarModelosUml(idProyecto),
    ])
      .then(([proyecto, accesoProyecto, modelosProyecto]) => {
        setProyectos((actuales) =>
          actuales.map((item) => (item.id === proyecto.id ? proyecto : item)),
        );
        setAcceso(accesoProyecto);
        setModelos(modelosProyecto);
        if (accesoProyecto.rol.nombre === 'Anfitrión' &&
            accesoProyecto.permisos.some(p => p.recurso === 'MODELO' && p.accion === 'EDITAR' && p.permitido)) {
          void listarModelosUmlPapelera(idProyecto).then(setModelosPapelera).catch(() => setModelosPapelera([]));
        } else {
          setModelosPapelera([]);
        }
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

  const puedeConsultarProyecto = useMemo(
    () =>
      acceso?.permisos.some(
        (permiso) =>
          permiso.recurso === 'PROYECTO' &&
          permiso.accion === 'CONSULTAR' &&
          permiso.permitido,
      ) ?? false,
    [acceso],
  );

  const puedeModificarProyecto = useMemo(
    () =>
      acceso?.permisos.some(
        (permiso) =>
          permiso.recurso === 'PROYECTO' &&
          permiso.accion === 'MODIFICAR' &&
          permiso.permitido,
      ) ?? false,
    [acceso],
  );

  // La papelera es exclusiva del Anfitrión, además de exigir MODIFICAR.
  const puedeGestionarPapelera = puedeModificarProyecto &&
    acceso?.rol.nombre === 'Anfitrión';

  const puedeGenerarBackend = useMemo(
    () =>
      acceso?.permisos.some(
        (permiso) =>
          permiso.recurso === 'GENERACION' &&
          permiso.accion === 'GENERAR' &&
          permiso.permitido,
      ) ?? false,
    [acceso],
  );

  const puedeImportarXmi = useMemo(
    () =>
      acceso?.permisos.some(
        (permiso) =>
          permiso.recurso === 'MODELO' &&
          permiso.accion === 'IMPORTAR' &&
          permiso.permitido,
      ) ?? false,
    [acceso],
  );

  const puedeExportarXmi = useMemo(
    () =>
      acceso?.permisos.some(
        (permiso) =>
          permiso.recurso === 'MODELO' &&
          permiso.accion === 'EXPORTAR' &&
          permiso.permitido,
      ) ?? false,
    [acceso],
  );

  const puedeAdministrarParticipantes = useMemo(
    () =>
      acceso?.permisos.some(
        (permiso) =>
          permiso.permitido &&
          (permiso.recurso === 'PARTICIPANTE' || permiso.recurso === 'ROL'),
      ) ?? false,
    [acceso],
  );

  const puedeGestionarModelos = acceso?.rol.nombre === 'Anfitrión' && puedeEditar;

  const enviarProyectoPapelera = async () => {
    if (!idProyecto || !proyectoSeleccionado || operandoPapelera) return;
    if (!window.confirm(`¿Enviar el proyecto «${proyectoSeleccionado.nombre}» a papelera por 30 días? Sus modelos, conversaciones y accesos quedarán temporalmente inaccesibles para todos.`)) return;
    setOperandoPapelera(true);
    setError(null);
    try {
      await moverProyectoPapelera(idProyecto);
      const [actualizados, eliminados] = await Promise.all([listarProyectos(), listarProyectosPapelera()]);
      setProyectos(actualizados);
      setProyectosPapelera(eliminados);
      setAcceso(null);
      setModelos([]);
      setIdProyecto(null);
      setModeloGeneracion(null);
      setModeloExportacion(null);
      setModoProyecto('papeleraProyectos');
      setMensajeProyecto('Proyecto enviado a la papelera. Puedes restaurarlo durante 30 días.');
    } catch (e: unknown) { setError(mensajeError(e)); }
    finally { setOperandoPapelera(false); }
  };

  const restaurarProyectoEliminado = async (id: string) => {
    if (operandoPapelera) return;
    setOperandoPapelera(true);
    setError(null);
    try {
      await restaurarProyectoPapelera(id);
      const [actualizados, eliminados] = await Promise.all([listarProyectos(), listarProyectosPapelera()]);
      setProyectos(actualizados);
      setProyectosPapelera(eliminados);
      setMensajeProyecto('Proyecto restaurado con sus modelos, conversaciones y permisos.');
      setAcceso(null);
      setModelos([]);
      setCargando(true);
      setIdProyecto(id);
      setModoProyecto('detalle');
    } catch (e: unknown) { setError(mensajeError(e)); }
    finally { setOperandoPapelera(false); }
  };

  const enviarModeloPapelera = async (idModelo: string, nombre: string) => {
    if (!idProyecto || operandoPapelera) return;
    if (!window.confirm(`¿Enviar el modelo «${nombre}» a la papelera durante 30 días? Sus conexiones colaborativas dejarán de ser accesibles.`)) return;
    setOperandoPapelera(true);
    setError(null);
    try {
      await moverModeloUmlPapelera(idProyecto, idModelo);
      setModelos(actuales => actuales.filter(m => m.id !== idModelo));
      setModelosPapelera(await listarModelosUmlPapelera(idProyecto));
      setMensajeProyecto('Modelo enviado a la papelera.');
    } catch (e: unknown) { setError(mensajeError(e)); }
    finally { setOperandoPapelera(false); }
  };

  const restaurarModeloEliminado = async (idModelo: string) => {
    if (!idProyecto || operandoPapelera) return;
    setOperandoPapelera(true);
    setError(null);
    try {
      await restaurarModeloUmlPapelera(idProyecto, idModelo);
      const [activos, eliminados] = await Promise.all([
        listarModelosUml(idProyecto), listarModelosUmlPapelera(idProyecto),
      ]);
      setModelos(activos);
      setModelosPapelera(eliminados);
      setMensajeProyecto('Modelo UML restaurado con su versión y relaciones intactas.');
    } catch (e: unknown) { setError(mensajeError(e)); }
    finally { setOperandoPapelera(false); }
  };

  const proyectoSeleccionado = proyectos.find(
    (proyecto) => proyecto.id === idProyecto,
  );

  const seleccionarProyecto = (nuevoIdProyecto: string) => {
    setModoProyecto('detalle');
    setModeloGeneracion(null);
    setModeloExportacion(null);
    setMensajeProyecto(null);
    setError(null);
    setMostrarPapeleraModelos(false);

    if (nuevoIdProyecto === idProyecto) {
      return;
    }

    setAcceso(null);
    setModelos([]);
    setCargando(true);
    setIdProyecto(nuevoIdProyecto);
  };

  const crearProyecto = async (valores: ProyectoFormValores) => {
    setGuardandoProyecto(true);
    setError(null);
    setMensajeProyecto(null);

    try {
      const creado = await crearProyectoApi({
        nombre: valores.nombre,
        descripcion: valores.descripcion || undefined,
      });

      setProyectos((actuales) => [
        creado,
        ...actuales.filter((item) => item.id !== creado.id),
      ]);
      setModoProyecto('detalle');
      setMensajeProyecto('Proyecto creado correctamente.');
      setAcceso(null);
      setModelos([]);
      setCargando(true);
      setIdProyecto(creado.id);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setGuardandoProyecto(false);
    }
  };

  const editarProyecto = async (valores: ProyectoFormValores) => {
    if (!idProyecto || !proyectoSeleccionado) {
      return;
    }

    setGuardandoProyecto(true);
    setError(null);
    setMensajeProyecto(null);

    try {
      const actualizado = await modificarProyectoApi(idProyecto, {
        nombre: valores.nombre,
        descripcion: valores.descripcion || null,
        configuracion: proyectoSeleccionado.configuracion,
      });

      setProyectos((actuales) =>
        actuales.map((item) => (item.id === actualizado.id ? actualizado : item)),
      );
      setAcceso((actual) =>
        actual ? { ...actual, proyecto: actualizado } : actual,
      );
      setModoProyecto('detalle');
      setMensajeProyecto('Información del proyecto actualizada correctamente.');
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setGuardandoProyecto(false);
    }
  };

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

    if (!idProyecto) {
      return;
    }

    if (!nombreNuevoModelo.trim()) {
      setError('Ingresa un nombre para crear el modelo UML.');
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
        nombreProyecto={proyectoSeleccionado?.nombre ?? 'Proyecto'}
        idUsuario={sesion.usuario.id}
        puedeEditar={puedeEditar}
        puedeConsultarConversaciones={
          acceso?.proyecto.id === idProyecto && puedeConsultarProyecto
        }
        puedeModificarConversaciones={
          acceso?.proyecto.id === idProyecto && puedeModificarProyecto
        }
        puedeGestionarPapelera={acceso?.proyecto.id === idProyecto && puedeGestionarPapelera}
        estadoAprendizaje={estadoAprendizaje}
        onCambiarAprendizaje={setEstadoAprendizaje}
        puedeGenerarBackend={puedeGenerarBackend}
        puedeImportarXmi={puedeImportarXmi}
        puedeExportarXmi={puedeExportarXmi}
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
          <Link className="button-link" to="/invitaciones">
            Invitaciones
          </Link>
          <Link className="button-link" to="/perfil">
            Mi perfil
          </Link>
          <button type="button" onClick={() => void alCerrarSesion()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="workspace-main">
        <aside className="project-sidebar" data-cu11-control="selector-proyecto">
          <div className="project-sidebar-heading">
            <h2>Proyectos</h2>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setModoProyecto('crear');
                setMensajeProyecto(null);
                setError(null);
              }}
            >
              + Nuevo
            </button>
          </div>

          {proyectos.length === 0 && !cargando && (
            <p className="muted">Todavía no tienes proyectos.</p>
          )}

          {(proyectosPapelera.length > 0 || puedeGestionarPapelera) && (
            <button type="button" onClick={() => {
              setModoProyecto('papeleraProyectos');
              setError(null);
            }}>Papelera de proyectos ({proyectosPapelera.length})</button>
          )}
          <div className="project-list">
            {proyectos.map((proyecto) => (
              <button
                type="button"
                className={proyecto.id === idProyecto && modoProyecto !== 'crear' ? 'active' : ''}
                key={proyecto.id}
                onClick={() => seleccionarProyecto(proyecto.id)}
              >
                <strong>{proyecto.nombre}</strong>
                <span>{proyecto.estado}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="models-section">
          {error && <div className="alert error-alert">{error}</div>}
          {mensajeProyecto && <div className="alert success-alert">{mensajeProyecto}</div>}
          {cargando && <div className="alert">Cargando…</div>}

          {modoProyecto === 'papeleraProyectos' && (
            <section className="papelera-recursos">
              <h2>Papelera de proyectos (30 días)</h2>
              <p className="muted">Solo los Anfitriones autorizados ven sus proyectos eliminados. Restaurar recupera modelos, conversaciones y accesos.</p>
              <button type="button" onClick={() => setModoProyecto('detalle')}>Volver a proyectos</button>
              {proyectosPapelera.length === 0 && <p>La papelera está vacía.</p>}
              {proyectosPapelera.map(p => (
                <article className="model-card" key={p.id}>
                  <h3>{p.nombre}</h3>
                  <p>Restaurable hasta {new Date(p.fechaPurga).toLocaleString()}</p>
                  <button type="button" disabled={operandoPapelera}
                    onClick={() => void restaurarProyectoEliminado(p.id)}>Restaurar proyecto</button>
                </article>
              ))}
            </section>
          )}

          {modoProyecto === 'crear' && (
            <ProyectoForm
              modo="crear"
              guardando={guardandoProyecto}
              onGuardar={crearProyecto}
              onCancelar={() => setModoProyecto('detalle')}
            />
          )}

          {modoProyecto === 'editar' && proyectoSeleccionado && (
            <ProyectoForm
              modo="editar"
              proyecto={proyectoSeleccionado}
              guardando={guardandoProyecto}
              onGuardar={editarProyecto}
              onCancelar={() => setModoProyecto('detalle')}
            />
          )}

          {modoProyecto === 'administrar' &&
            proyectoSeleccionado &&
            acceso && (
              <GestionParticipantes
                idProyecto={proyectoSeleccionado.id}
                nombreProyecto={proyectoSeleccionado.nombre}
                acceso={acceso}
                onVolver={() => {
                  setModoProyecto('detalle');
                  setMensajeProyecto(null);
                  setError(null);
                }}
              />
            )}

          {modoProyecto === 'conversaciones' &&
            proyectoSeleccionado &&
            idProyecto &&
            acceso?.proyecto.id === idProyecto &&
            puedeConsultarProyecto && (
              <ConversacionesIaPanel
                key={idProyecto}
                idProyecto={idProyecto}
                nombreProyecto={proyectoSeleccionado.nombre}
                idUsuario={sesion.usuario.id}
                puedeModificar={puedeModificarProyecto}
                puedeGestionarPapelera={puedeGestionarPapelera}
                onVolver={() => {
                  setModoProyecto('detalle');
                  setError(null);
                }}
              />
            )}

          {modoProyecto === 'generar' &&
            proyectoSeleccionado &&
            modeloGeneracion &&
            idProyecto && (
              <GeneracionBackendPanel
                idProyecto={idProyecto}
                modelo={modeloGeneracion}
                onVolver={() => {
                  setModoProyecto('detalle');
                  setModeloGeneracion(null);
                  setError(null);
                }}
                onAbrirModelo={() => {
                  const idModelo = modeloGeneracion.id;
                  setModoProyecto('detalle');
                  setModeloGeneracion(null);
                  void abrirModelo(idModelo);
                }}
              />
            )}

          {modoProyecto === 'importar' &&
            proyectoSeleccionado &&
            idProyecto && (
              <ImportacionXmiPanel
                idProyecto={idProyecto}
                onVolver={() => {
                  setModoProyecto('detalle');
                  setError(null);
                }}
                onImportado={(modelo) => {
                  setModelos((actuales) => [
                    modelo,
                    ...actuales.filter((item) => item.id !== modelo.id),
                  ]);
                  setModoProyecto('detalle');
                  cargarModelo(modelo);
                }}
              />
            )}

          {modoProyecto === 'exportar' &&
            proyectoSeleccionado &&
            modeloExportacion &&
            idProyecto && (
              <ExportacionXmiPanel
                idProyecto={idProyecto}
                modelo={modeloExportacion}
                onVolver={() => {
                  setModoProyecto('detalle');
                  setModeloExportacion(null);
                  setError(null);
                }}
                onAbrirModelo={() => {
                  const idModelo = modeloExportacion.id;
                  setModoProyecto('detalle');
                  setModeloExportacion(null);
                  void abrirModelo(idModelo);
                }}
              />
            )}

          {modoProyecto === 'detalle' && proyectoSeleccionado && (
            <>
              <ProyectoDetalle
                proyecto={proyectoSeleccionado}
                acceso={acceso}
                puedeModificar={puedeModificarProyecto}
                puedeAdministrarParticipantes={puedeAdministrarParticipantes}
                onAdministrarParticipantes={() => {
                  setModoProyecto('administrar');
                  setMensajeProyecto(null);
                  setError(null);
                }}
                puedeEliminar={Boolean(puedeGestionarPapelera)}
                onEliminar={() => void enviarProyectoPapelera()}
                onEditar={() => {
                  setModoProyecto('editar');
                  setMensajeProyecto(null);
                  setError(null);
                }}
              />

              {puedeConsultarProyecto && (
                <div className="cu12-entry">
                  <div>
                    <h3>Conversaciones del proyecto</h3>
                    <p className="muted">
                      Consulta y comparte mensajes con los participantes autorizados.
                      También puedes consultar a GroqCloud desde cada conversación.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    data-cu11-control="abrir-conversaciones"
                    onClick={() => {
                      setModoProyecto('conversaciones');
                      setMensajeProyecto(null);
                      setError(null);
                    }}
                  >
                    Abrir conversaciones
                  </button>
                </div>
              )}

              <div className="section-heading models-heading-block">
                <div>
                  <div className="eyebrow">Modelado UML</div>
                  <h2>Modelos del proyecto</h2>
                  {acceso && (
                    <p className="muted">
                      Rol: {acceso.rol.nombre} ·{' '}
                      {puedeEditar ? 'edición habilitada' : 'solo lectura'}
                    </p>
                  )}
                </div>

                <div className="model-heading-actions">
                  {puedeGestionarModelos && idProyecto && (
                    <button type="button" onClick={() => setMostrarPapeleraModelos(v => !v)}>
                      {mostrarPapeleraModelos ? 'Ocultar papelera de modelos' : `Papelera de modelos (${modelosPapelera.length})`}
                    </button>
                  )}
                  {puedeImportarXmi && idProyecto && (
                    <button
                      type="button"
                      data-cu11-control="importar-xmi"
                      onClick={() => {
                        setModoProyecto('importar');
                        setMensajeProyecto(null);
                        setError(null);
                      }}
                    >
                      Importar XMI
                    </button>
                  )}
                  {puedeEditar && idProyecto && (
                    <form className="new-model-form" onSubmit={(event) => void crearModelo(event)}>
                    <input
                      placeholder="Nombre del nuevo modelo"
                      value={nombreNuevoModelo}
                      maxLength={150}
                      required
                      onChange={(event) => {
                        setNombreNuevoModelo(event.target.value);
                        if (error === 'Ingresa un nombre para crear el modelo UML.') {
                          setError(null);
                        }
                      }}
                    />
                    <button className="primary-button" disabled={creando}>
                      {creando ? 'Creando…' : '+ Nuevo modelo'}
                    </button>
                    </form>
                  )}
                </div>
              </div>

              {mostrarPapeleraModelos && puedeGestionarModelos && (
                <section className="papelera-recursos">
                  <h3>Modelos en papelera (30 días)</h3>
                  {modelosPapelera.length === 0 && <p>La papelera de modelos está vacía.</p>}
                  {modelosPapelera.map(m => (
                    <article className="model-card" key={m.id}>
                      <h3>{m.nombre}</h3>
                      <p>Restaurable hasta {new Date(m.fechaPurga).toLocaleString()}</p>
                      <button type="button" disabled={operandoPapelera}
                        onClick={() => void restaurarModeloEliminado(m.id)}>Restaurar modelo</button>
                    </article>
                  ))}
                </section>
              )}
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
                      <div className="model-card-actions">
                        <button
                          type="button"
                          data-cu11-control="abrir-modelo"
                          onClick={() => void abrirModelo(modelo.id)}
                        >
                          Abrir
                        </button>
                        {puedeGestionarModelos && (
                          <button type="button" disabled={operandoPapelera}
                            onClick={() => void enviarModeloPapelera(modelo.id, modelo.nombre)}>
                            Mover a papelera
                          </button>
                        )}
                        {puedeExportarXmi && (
                          <button
                            type="button"
                            data-cu11-control="exportar-xmi"
                            onClick={() => {
                              setModeloExportacion(modelo);
                              setModoProyecto('exportar');
                              setMensajeProyecto(null);
                              setError(null);
                            }}
                          >
                            Exportar XMI
                          </button>
                        )}
                        {puedeGenerarBackend && (
                          <button
                            type="button"
                            className="primary-button"
                            data-cu11-control="generar-backend"
                            onClick={() => {
                              setModeloGeneracion(modelo);
                              setModoProyecto('generar');
                              setMensajeProyecto(null);
                              setError(null);
                            }}
                          >
                            Generar backend
                          </button>
                        )}
                      </div>
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
            </>
          )}

          {modoProyecto === 'detalle' && !proyectoSeleccionado && !cargando && (
            <div className="no-project-state">
              <div>
                <div className="eyebrow">Primer proyecto</div>
                <h2>Comienza creando un proyecto colaborativo</h2>
                <p>
                  Al crearlo quedarás incorporado automáticamente como Anfitrión y podrás comenzar a modelar.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setModoProyecto('crear')}
                >
                  Crear proyecto
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <AprendizajeAsistido
        estado={estadoAprendizaje}
        onCambiar={setEstadoAprendizaje}
        contexto={{
          autenticado: true,
          proyectoSeleccionado: Boolean(idProyecto && acceso?.proyecto.id === idProyecto),
          modeloAbierto: false,
          puedeEditarModelo: false,
          puedeConsultarConversaciones: puedeConsultarProyecto,
          puedeGenerarBackend,
          puedeImportarXmi,
          puedeExportarXmi,
        }}
      />
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
      <Route path="/invitaciones" element={<InvitacionesView />} />
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
