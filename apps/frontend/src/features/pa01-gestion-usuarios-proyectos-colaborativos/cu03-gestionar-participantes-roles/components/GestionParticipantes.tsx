import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { AccesoProyecto } from '../../cu02-gestionar-proyecto-colaborativo/api/proyectos.api';
import {
  asignarPermisoParticular,
  cambiarRolParticipante,
  crearRol,
  invitarParticipante,
  listarParticipantes,
  listarPermisos,
  listarRoles,
  obtenerPermisosParticipante,
  retirarParticipante,
  type ParticipanteProyecto,
  type PermisoDisponible,
  type PermisoEfectivoParticipante,
  type RolProyecto,
} from '../api/participantes-roles.api';

interface GestionParticipantesProps {
  idProyecto: string;
  nombreProyecto: string;
  acceso: AccesoProyecto;
  onVolver: () => void;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function tienePermiso(
  acceso: AccesoProyecto,
  recurso: string,
  accion: string,
): boolean {
  return acceso.permisos.some(
    (permiso) =>
      permiso.recurso === recurso &&
      permiso.accion === accion &&
      permiso.permitido,
  );
}

export function GestionParticipantes({
  idProyecto,
  nombreProyecto,
  acceso,
  onVolver,
}: GestionParticipantesProps) {
  const [participantes, setParticipantes] = useState<ParticipanteProyecto[]>([]);
  const [roles, setRoles] = useState<RolProyecto[]>([]);
  const [permisos, setPermisos] = useState<PermisoDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [correoInvitado, setCorreoInvitado] = useState('');
  const [idRolInvitacion, setIdRolInvitacion] = useState('');

  const [nombreRol, setNombreRol] = useState('');
  const [descripcionRol, setDescripcionRol] = useState('');
  const [permisosRol, setPermisosRol] = useState<string[]>([]);

  const [participantePermisos, setParticipantePermisos] =
    useState<ParticipanteProyecto | null>(null);
  const [permisosEfectivos, setPermisosEfectivos] = useState<
    PermisoEfectivoParticipante[]
  >([]);

  const puedeConsultarParticipantes = tienePermiso(
    acceso,
    'PARTICIPANTE',
    'CONSULTAR',
  );
  const puedeInvitar = tienePermiso(acceso, 'PARTICIPANTE', 'INVITAR');
  const puedeCambiarRol = tienePermiso(
    acceso,
    'PARTICIPANTE',
    'CAMBIAR_ROL',
  );
  const puedeRetirar = tienePermiso(acceso, 'PARTICIPANTE', 'RETIRAR');
  const puedeAsignarPermiso = tienePermiso(
    acceso,
    'PARTICIPANTE',
    'ASIGNAR_PERMISO',
  );
  const puedeConsultarRoles = tienePermiso(acceso, 'ROL', 'CONSULTAR');
  const puedeCrearRol = tienePermiso(acceso, 'ROL', 'CREAR');

  const rolesAsignables = useMemo(
    () =>
      roles.filter(
        (rol) =>
          rol.estado === 'ACTIVO' &&
          !(rol.esPredeterminado && rol.nombre === 'Anfitrión'),
      ),
    [roles],
  );

  useEffect(() => {
    const solicitudes: Array<Promise<{ tipo: 'participantes' | 'roles' | 'permisos'; datos: unknown }>> = [];

    if (puedeConsultarParticipantes) {
      solicitudes.push(
        listarParticipantes(idProyecto).then((datos) => ({
          tipo: 'participantes' as const,
          datos,
        })),
      );
    }

    if (puedeConsultarRoles) {
      solicitudes.push(
        listarRoles(idProyecto).then((datos) => ({
          tipo: 'roles' as const,
          datos,
        })),
      );
      solicitudes.push(
        listarPermisos(idProyecto).then((datos) => ({
          tipo: 'permisos' as const,
          datos,
        })),
      );
    }

    void Promise.all(solicitudes)
      .then((resultados) => {
        resultados.forEach((resultado) => {
          if (resultado.tipo === 'participantes') {
            setParticipantes(resultado.datos as ParticipanteProyecto[]);
          } else if (resultado.tipo === 'roles') {
            setRoles(resultado.datos as RolProyecto[]);
          } else {
            setPermisos(resultado.datos as PermisoDisponible[]);
          }
        });
      })
      .catch((unknownError: unknown) => setError(mensajeError(unknownError)))
      .finally(() => setCargando(false));
  }, [idProyecto, puedeConsultarParticipantes, puedeConsultarRoles]);

  const idRolInvitacionActivo =
    idRolInvitacion || rolesAsignables[0]?.id || '';

  const enviarInvitacion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!correoInvitado.trim() || !idRolInvitacionActivo) {
      return;
    }

    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      const invitacion = await invitarParticipante(
        idProyecto,
        correoInvitado.trim(),
        idRolInvitacionActivo,
      );

      setCorreoInvitado('');
      setMensaje(
        `Invitación creada para ${invitacion.usuario.correo}. El usuario aparecerá como participante cuando acepte la invitación.`,
      );
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const enviarRol = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombreRol.trim()) {
      return;
    }

    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      const nuevoRol = await crearRol(idProyecto, {
        nombre: nombreRol.trim(),
        descripcion: descripcionRol.trim() || undefined,
        permisosIds: permisosRol,
      });

      setRoles((actuales) => [...actuales, nuevoRol]);
      setNombreRol('');
      setDescripcionRol('');
      setPermisosRol([]);
      setMensaje(`Rol “${nuevoRol.nombre}” creado correctamente.`);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const cambiarRol = async (
    participante: ParticipanteProyecto,
    idRol: string,
  ) => {
    if (!idRol || idRol === participante.idRol) {
      return;
    }

    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      await cambiarRolParticipante(
        idProyecto,
        participante.idMembresia,
        idRol,
      );
      const actualizados = await listarParticipantes(idProyecto);
      setParticipantes(actualizados);
      setMensaje('Rol del participante actualizado correctamente.');
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const retirar = async (participante: ParticipanteProyecto) => {
    const confirmado = window.confirm(
      `¿Retirar a ${participante.nombre} ${participante.apellido} del proyecto?`,
    );

    if (!confirmado) {
      return;
    }

    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      await retirarParticipante(idProyecto, participante.idMembresia);
      setParticipantes((actuales) =>
        actuales.filter(
          (item) => item.idMembresia !== participante.idMembresia,
        ),
      );
      if (participantePermisos?.idMembresia === participante.idMembresia) {
        setParticipantePermisos(null);
        setPermisosEfectivos([]);
      }
      setMensaje('Participante retirado correctamente.');
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const abrirPermisos = async (participante: ParticipanteProyecto) => {
    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      const efectivos = await obtenerPermisosParticipante(
        idProyecto,
        participante.idMembresia,
      );
      setParticipantePermisos(participante);
      setPermisosEfectivos(efectivos);
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const asignarExcepcion = async (
    permiso: PermisoEfectivoParticipante,
    tipoAsignacion: 'CONCEDER' | 'DENEGAR',
  ) => {
    if (!participantePermisos) {
      return;
    }

    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      const efectivos = await asignarPermisoParticular(
        idProyecto,
        participantePermisos.idMembresia,
        permiso.idPermiso,
        tipoAsignacion,
      );
      setPermisosEfectivos(efectivos);
      setMensaje(
        `Excepción ${tipoAsignacion.toLowerCase()} aplicada correctamente.`,
      );
    } catch (unknownError: unknown) {
      setError(mensajeError(unknownError));
    } finally {
      setProcesando(false);
    }
  };

  const alternarPermisoRol = (idPermiso: string) => {
    setPermisosRol((actuales) =>
      actuales.includes(idPermiso)
        ? actuales.filter((id) => id !== idPermiso)
        : [...actuales, idPermiso],
    );
  };

  return (
    <div className="cu03-shell">
      <div className="cu03-heading">
        <div>
          <div className="eyebrow">CU-03 · Administración</div>
          <h2>Participantes y roles</h2>
          <p className="muted">Proyecto: {nombreProyecto}</p>
        </div>
        <button type="button" onClick={onVolver}>
          ← Volver al proyecto
        </button>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {mensaje && <div className="alert success-alert">{mensaje}</div>}
      {cargando && <div className="alert">Cargando administración…</div>}

      {puedeInvitar && puedeConsultarRoles && (
        <section className="cu03-card">
          <div className="cu03-card-heading">
            <div>
              <div className="eyebrow">Invitación</div>
              <h3>Invitar participante</h3>
            </div>
          </div>
          <form className="cu03-inline-form" onSubmit={(event) => void enviarInvitacion(event)}>
            <label>
              Correo de la cuenta registrada
              <input
                type="email"
                value={correoInvitado}
                onChange={(event) => setCorreoInvitado(event.target.value)}
                placeholder="usuario@correo.com"
                required
              />
            </label>
            <label>
              Rol al aceptar
              <select
                value={idRolInvitacionActivo}
                onChange={(event) => setIdRolInvitacion(event.target.value)}
                required
              >
                {rolesAsignables.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary-button"
              disabled={procesando || rolesAsignables.length === 0}
            >
              Crear invitación
            </button>
          </form>
          {rolesAsignables.length === 0 && (
            <p className="muted cu03-note">
              Crea primero un rol asignable para poder invitar participantes.
            </p>
          )}
        </section>
      )}

      {puedeConsultarParticipantes && (
        <section className="cu03-card">
          <div className="cu03-card-heading">
            <div>
              <div className="eyebrow">Membresías activas</div>
              <h3>Participantes</h3>
            </div>
            <span className="cu03-count">{participantes.length}</span>
          </div>

          <div className="cu03-participants">
            {participantes.map((participante) => {
              const esAnfitrionPredeterminado =
                participante.rolPredeterminado &&
                participante.rolNombre === 'Anfitrión';

              return (
                <article className="cu03-participant" key={participante.idMembresia}>
                  <div className="cu03-participant-main">
                    <div className="cu03-avatar" aria-hidden="true">
                      {participante.nombre.charAt(0)}
                      {participante.apellido.charAt(0)}
                    </div>
                    <div>
                      <strong>
                        {participante.nombre} {participante.apellido}
                      </strong>
                      <span>{participante.correo}</span>
                      <small>{participante.estadoMembresia}</small>
                    </div>
                  </div>

                  <div className="cu03-participant-actions">
                    {puedeCambiarRol && !esAnfitrionPredeterminado ? (
                      <select
                        value={participante.idRol}
                        disabled={procesando}
                        onChange={(event) =>
                          void cambiarRol(participante, event.target.value)
                        }
                        aria-label={`Rol de ${participante.nombre}`}
                      >
                        {rolesAsignables.map((rol) => (
                          <option key={rol.id} value={rol.id}>
                            {rol.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="cu03-role-chip">{participante.rolNombre}</span>
                    )}

                    {puedeAsignarPermiso && !esAnfitrionPredeterminado && (
                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() => void abrirPermisos(participante)}
                      >
                        Permisos
                      </button>
                    )}

                    {puedeRetirar && !esAnfitrionPredeterminado && (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={procesando}
                        onClick={() => void retirar(participante)}
                      >
                        Retirar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {!cargando && participantes.length === 0 && (
            <p className="muted">No hay participantes activos para mostrar.</p>
          )}
        </section>
      )}

      {participantePermisos && puedeAsignarPermiso && (
        <section className="cu03-card cu03-permissions-card">
          <div className="cu03-card-heading">
            <div>
              <div className="eyebrow">Permisos particulares</div>
              <h3>
                {participantePermisos.nombre} {participantePermisos.apellido}
              </h3>
              <p className="muted">
                Las excepciones particulares se combinan con los permisos del rol;
                una denegación prevalece sobre una concesión.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setParticipantePermisos(null);
                setPermisosEfectivos([]);
              }}
            >
              Cerrar
            </button>
          </div>

          <div className="cu03-permission-list">
            {permisosEfectivos.map((permiso) => (
              <div className="cu03-permission-row" key={permiso.idPermiso}>
                <div>
                  <strong>{permiso.nombre}</strong>
                  <span>
                    {permiso.recurso} / {permiso.accion}
                  </span>
                </div>
                <div className="cu03-permission-status">
                  <span className={permiso.permitido ? 'allowed' : 'denied'}>
                    {permiso.permitido ? 'Permitido' : 'No permitido'}
                  </span>
                  <small>Fuente: {permiso.fuente}</small>
                </div>
                <div className="cu03-permission-actions">
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={() => void asignarExcepcion(permiso, 'CONCEDER')}
                  >
                    Conceder
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={procesando}
                    onClick={() => void asignarExcepcion(permiso, 'DENEGAR')}
                  >
                    Denegar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {puedeConsultarRoles && (
        <section className="cu03-card">
          <div className="cu03-card-heading">
            <div>
              <div className="eyebrow">Control de acceso</div>
              <h3>Roles del proyecto</h3>
            </div>
          </div>

          <div className="cu03-role-grid">
            {roles.map((rol) => (
              <article key={rol.id} className="cu03-role-card">
                <div>
                  <strong>{rol.nombre}</strong>
                  {rol.esPredeterminado && <span>Predeterminado</span>}
                </div>
                <p>{rol.descripcion || 'Sin descripción'}</p>
              </article>
            ))}
          </div>

          {puedeCrearRol && (
            <form className="cu03-role-form" onSubmit={(event) => void enviarRol(event)}>
              <div className="cu03-card-heading">
                <div>
                  <div className="eyebrow">Nuevo rol</div>
                  <h3>Crear rol personalizado</h3>
                </div>
              </div>

              <div className="cu03-form-grid">
                <label>
                  Nombre
                  <input
                    value={nombreRol}
                    onChange={(event) => setNombreRol(event.target.value)}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Descripción
                  <input
                    value={descripcionRol}
                    onChange={(event) => setDescripcionRol(event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <div className="cu03-permission-checkboxes">
                {permisos.map((permiso) => (
                  <label key={permiso.id}>
                    <input
                      type="checkbox"
                      checked={permisosRol.includes(permiso.id)}
                      onChange={() => alternarPermisoRol(permiso.id)}
                    />
                    <span>
                      <strong>{permiso.nombre}</strong>
                      <small>
                        {permiso.recurso} / {permiso.accion}
                      </small>
                    </span>
                  </label>
                ))}
              </div>

              <div className="cu03-form-actions">
                <button className="primary-button" disabled={procesando}>
                  Crear rol
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {!cargando &&
        !puedeConsultarParticipantes &&
        !puedeConsultarRoles &&
        !puedeInvitar && (
          <div className="empty-state">
            <h3>Sin operaciones de administración disponibles</h3>
            <p>Tu rol actual no dispone de permisos para gestionar participantes o roles.</p>
          </div>
        )}
    </div>
  );
}
