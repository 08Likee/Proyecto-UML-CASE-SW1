import { useCallback, useEffect, useRef, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import { leerSesion } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/cu01-gestionar-cuenta-acceso/storage/auth.storage';
import { obtenerModeloUml } from '../../cu05-modelar-diagrama-clases/api/modelos-uml.api';
import { useModeladorStore } from '../../cu05-modelar-diagrama-clases/store/modelador.store';
import {
  documentoTieneContenido,
  obtenerContenidoDocumento,
  ORIGEN_ZUSTAND,
  registrarGuardadoRestEnDocumento,
  sincronizarContenidoDocumento,
} from '../collaboration/modelo-yjs';
import { obtenerAccesoColaboracion } from '../api/colaboracion.api';
import { admiteModoOffline, esAccesoRevocadoHttp, esRechazoAutorizacionColaborativa } from './estado-acceso-colaboracion';

export type EstadoConexionColaboracion =
  | 'conectando'
  | 'conectado'
  | 'desconectado';

export interface ModeloColaborativoState {
  listo: boolean;
  conexion: EstadoConexionColaboracion;
  sincronizado: boolean;
  cacheLocalLista: boolean;
  puedeEditar: boolean;
  participantes: number;
  error: string | null;
  modoOffline: boolean;
  accesoRevocado: boolean;
  prepararGuardadoManual: () => Promise<number>;
  registrarGuardadoRest: () => void;
  integrarAplicacionIa: (estadoYjsBase64: string, version: number) => void;
}

interface UseModeloColaborativoArgs {
  idProyecto: string;
  idModelo: string;
  puedeEditarInicial: boolean;
}

interface RecursosColaboracion {
  document: Y.Doc;
  provider: HocuspocusProvider;
  indexeddb: IndexeddbPersistence;
}

const PERMISSION_SYNC_MS = 5_000;
const VERSION_REFRESH_DELAY_MS = 1_200;

function collaborationUrl(): string {
  const value = import.meta.env.VITE_COLLABORATION_URL as string | undefined;

  if (!value?.trim()) {
    throw new Error('VITE_COLLABORATION_URL no está configurada');
  }

  return value.replace(/\/$/, '');
}

function mensajeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo iniciar la colaboración';
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function esFalloTemporalDeRed(reason: string): boolean {
  const normalizado = reason.toLowerCase();

  return (
    normalizado.includes('failed to fetch') ||
    normalizado.includes('networkerror') ||
    normalizado.includes('load failed')
  );
}

function contarParticipantes(states: readonly unknown[]): number {
  const usuarios = new Set<string>();

  for (const state of states) {
    if (typeof state !== 'object' || state === null) {
      continue;
    }

    const usuario = (state as Record<string, unknown>).usuario;
    if (typeof usuario !== 'object' || usuario === null) {
      continue;
    }

    const idUsuario = (usuario as Record<string, unknown>).id;
    if (typeof idUsuario === 'string' && idUsuario.trim()) {
      usuarios.add(idUsuario);
    }
  }

  return Math.max(1, usuarios.size > 0 ? usuarios.size : states.length);
}

export function useModeloColaborativo({
  idProyecto,
  idModelo,
  puedeEditarInicial,
}: UseModeloColaborativoArgs): ModeloColaborativoState {
  const recursosRef = useRef<RecursosColaboracion | null>(null);
  const accesoRevocadoRef = useRef(false);
  const listoRef = useRef(false);
  const refrescoVersionRef = useRef<number | null>(null);
  const metadatosBaseRef = useRef<{ nombre: string; descripcion: string | null } | null>(null);
  const [listo, setListo] = useState(false);
  const [conexion, setConexion] =
    useState<EstadoConexionColaboracion>('conectando');
  const [sincronizado, setSincronizado] = useState(false);
  const [cacheLocalLista, setCacheLocalLista] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(puedeEditarInicial);
  const [participantes, setParticipantes] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [accesoRevocado, setAccesoRevocado] = useState(false);

  const marcarAccesoRevocado = useCallback(() => {
    accesoRevocadoRef.current = true;
    setAccesoRevocado(true);
    setPuedeEditar(false);
    setSincronizado(false);
    setParticipantes(1);
    setConexion('desconectado');
    setError(null);
  }, []);

  const refrescarVersion = useCallback(async () => {
    try {
      const vigente = await obtenerModeloUml(idProyecto, idModelo);
      const actual = useModeladorStore.getState().modelo;

      if (!actual || actual.id !== idModelo) {
        return vigente.version;
      }

      useModeladorStore.setState({
        modelo: {
          ...actual,
          version: vigente.version,
          fechaActualizacion: vigente.fechaActualizacion,
        },
      });

      return vigente.version;
    } catch {
      return useModeladorStore.getState().modelo?.version ?? 1;
    }
  }, [idModelo, idProyecto]);

  const programarRefrescoVersion = useCallback(() => {
    if (refrescoVersionRef.current !== null) {
      window.clearTimeout(refrescoVersionRef.current);
    }

    refrescoVersionRef.current = window.setTimeout(() => {
      refrescoVersionRef.current = null;
      void refrescarVersion();
    }, VERSION_REFRESH_DELAY_MS);
  }, [refrescarVersion]);

  useEffect(() => {
    let activo = true;
    listoRef.current = false;
    accesoRevocadoRef.current = false;
    const resetEstadoTimer = window.setTimeout(() => {
      if (!activo) {
        return;
      }

      setListo(false);
      setConexion('conectando');
      setSincronizado(false);
      setCacheLocalLista(false);
      setPuedeEditar(puedeEditarInicial);
      setParticipantes(1);
      setError(null);
      setAccesoRevocado(false);
    }, 0);
    const modeloInicial = useModeladorStore.getState().modelo;
    metadatosBaseRef.current = modeloInicial && modeloInicial.id === idModelo
      ? { nombre: modeloInicial.nombre, descripcion: modeloInicial.descripcion }
      : null;

    const documentName = `modelo-uml:${idProyecto}:${idModelo}`;
    const document = new Y.Doc();
    const indexeddb = new IndexeddbPersistence(documentName, document);

    const aplicarDocumentoAlStore = () => {
      const contenido = obtenerContenidoDocumento(document);
      const actual = useModeladorStore.getState().modelo;

      if (!contenido || !actual || actual.id !== idModelo) {
        return;
      }

      if (JSON.stringify(actual.contenido) === JSON.stringify(contenido)) {
        return;
      }

      useModeladorStore.setState({
        modelo: {
          ...actual,
          contenido,
        },
      });
    };

    const marcarListoSiHayContenido = () => {
      if (accesoRevocadoRef.current || !documentoTieneContenido(document)) {
        return;
      }

      aplicarDocumentoAlStore();
      listoRef.current = true;
      setListo(true);
    };

    const token = async () => {
      if (accesoRevocadoRef.current) {
        throw new Error('El acceso al modelo fue revocado. Regresá a proyectos.');
      }
      try {
        const acceso = await obtenerAccesoColaboracion(idProyecto, idModelo);
        if (activo) setPuedeEditar(acceso.puedeEditar);
      } catch (error: unknown) {
        if (activo && esAccesoRevocadoHttp(error)) marcarAccesoRevocado();
        throw error;
      }

      const sesion = leerSesion();
      if (!sesion) throw new Error('La sesión no está disponible');
      return sesion.accessToken;
    };

    let provider: HocuspocusProvider;
    let conectado = false;

    try {
      provider = new HocuspocusProvider({
        url: collaborationUrl(),
        name: documentName,
        document,
        token,
        flushDelay: 150,
        onStatus: ({ status }) => {
          if (!activo || accesoRevocadoRef.current) {
            return;
          }

          if (status === 'connected') {
            conectado = true;
            setConexion('conectado');
            setError(null);
            return;
          }

          if (status === 'connecting') {
            conectado = false;
            setConexion('conectando');
            return;
          }

          conectado = false;
          setConexion('desconectado');
          setSincronizado(false);
          setParticipantes(1);
        },
        onSynced: ({ state }) => {
          if (!activo || accesoRevocadoRef.current || !state) {
            return;
          }

          setSincronizado(true);
          marcarListoSiHayContenido();
          programarRefrescoVersion();
        },
        onAuthenticationFailed: ({ reason }) => {
          if (!activo || accesoRevocadoRef.current) {
            return;
          }

          if (reason && esRechazoAutorizacionColaborativa(reason)) {
            marcarAccesoRevocado();
            return;
          }
          if (reason && esFalloTemporalDeRed(reason)) {
            // Un fallo HTTP al refrescar el token no implica que el WebSocket
            // ya se haya desconectado. onStatus es la fuente de verdad.
            setError(null);
            return;
          }

          setError(reason || 'No se pudo autenticar la sesión colaborativa');
          setConexion('desconectado');
        },
        onAwarenessChange: ({ states }) => {
          if (activo && !accesoRevocadoRef.current) {
            setParticipantes(contarParticipantes(states));
          }
        },
      });
    } catch (unknownError: unknown) {
      indexeddb.destroy();
      document.destroy();
      const errorInicializacion = mensajeError(unknownError);
      const errorTimer = window.setTimeout(() => {
        if (!activo) {
          return;
        }

        setError(errorInicializacion);
        setConexion('desconectado');
      }, 0);

      return () => {
        activo = false;
        window.clearTimeout(resetEstadoTimer);
        window.clearTimeout(errorTimer);
      };
    }

    recursosRef.current = { document, provider, indexeddb };

    const sesion = leerSesion();
    if (sesion) {
      provider.setAwarenessField('usuario', {
        id: sesion.usuario.id,
        nombre: `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim(),
      });
    }

    const onIndexedDbSynced = () => {
      if (!activo || accesoRevocadoRef.current) {
        return;
      }

      setCacheLocalLista(true);
      marcarListoSiHayContenido();
    };

    indexeddb.on('synced', onIndexedDbSynced);

    const onDocumentUpdate = (_update: Uint8Array, origin: unknown) => {
      if (!activo || accesoRevocadoRef.current) {
        return;
      }

      if (origin !== ORIGEN_ZUSTAND) {
        aplicarDocumentoAlStore();
      }

      if (listoRef.current) {
        programarRefrescoVersion();
      }
    };

    document.on('update', onDocumentUpdate);

    const unsubscribeStore = useModeladorStore.subscribe((state, previous) => {
      if (!activo || accesoRevocadoRef.current || !listoRef.current) {
        return;
      }

      const modelo = state.modelo;
      const previousModelo = previous.modelo;

      if (!modelo || modelo.id !== idModelo) {
        return;
      }

      if (modelo.contenido === previousModelo?.contenido) {
        return;
      }

      if (
        JSON.stringify(modelo.contenido) ===
        JSON.stringify(previousModelo?.contenido)
      ) {
        return;
      }

      sincronizarContenidoDocumento(document, modelo.contenido);
      const base = metadatosBaseRef.current;
      const metadatosSucios =
        !!base &&
        (modelo.nombre !== base.nombre || modelo.descripcion !== base.descripcion);
      useModeladorStore.setState({ sucio: metadatosSucios });
    });

    const permissionTimer = window.setInterval(() => {
      if (accesoRevocadoRef.current || !conectado || !navigator.onLine) {
        return;
      }

      void Promise.resolve(provider.sendToken()).catch(() => {
        // La pérdida de red no debe invalidar la copia local del modelo.
      });
    }, PERMISSION_SYNC_MS);

    return () => {
      activo = false;
      listoRef.current = false;
      if (refrescoVersionRef.current !== null) {
        window.clearTimeout(refrescoVersionRef.current);
        refrescoVersionRef.current = null;
      }
      window.clearTimeout(resetEstadoTimer);
      window.clearInterval(permissionTimer);
      unsubscribeStore();
      document.off('update', onDocumentUpdate);
      indexeddb.off('synced', onIndexedDbSynced);
      provider.destroy();
      void indexeddb.destroy();
      document.destroy();
      recursosRef.current = null;
    };
  }, [idModelo, idProyecto, puedeEditarInicial, programarRefrescoVersion, marcarAccesoRevocado]);

  const prepararGuardadoManual = useCallback(async () => {
    const recursos = recursosRef.current;

    if (accesoRevocadoRef.current) throw new Error('Acceso revocado: el modelo no se puede guardar.');

    if (recursos && conexion === 'conectado') {
      recursos.provider.flushPendingUpdates();
      await esperar(VERSION_REFRESH_DELAY_MS);
    }

    return refrescarVersion();
  }, [conexion, refrescarVersion]);

  const registrarGuardadoRest = useCallback(() => {
    const recursos = recursosRef.current;

    if (!recursos) {
      return;
    }

    const modelo = useModeladorStore.getState().modelo;
    if (modelo && modelo.id === idModelo) {
      metadatosBaseRef.current = {
        nombre: modelo.nombre,
        descripcion: modelo.descripcion,
      };
      useModeladorStore.setState({ sucio: false });
    }

    registrarGuardadoRestEnDocumento(recursos.document);
    programarRefrescoVersion();
  }, [idModelo, programarRefrescoVersion]);

  const integrarAplicacionIa = useCallback((estadoYjsBase64: string, version: number) => {
    const recursos = recursosRef.current;
    if (accesoRevocadoRef.current || !recursos || conexion !== 'conectado' || !sincronizado || !puedeEditar) {
      throw new Error('La colaboración debe estar sincronizada para recibir cambios UML aprobados.');
    }
    const update = Uint8Array.from(window.atob(estadoYjsBase64), (c) => c.charCodeAt(0));
    Y.applyUpdate(recursos.document, update, 'cu13-aplicacion-ia');
    const actual = useModeladorStore.getState().modelo;
    if (actual?.id === idModelo) {
      useModeladorStore.setState({ modelo: { ...actual, version } });
    }
    programarRefrescoVersion();
  }, [conexion, sincronizado, puedeEditar, idModelo, programarRefrescoVersion]);

  return {
    listo,
    conexion,
    sincronizado,
    cacheLocalLista,
    puedeEditar,
    participantes,
    error,
    modoOffline: admiteModoOffline(conexion, listo, accesoRevocado, error),
    accesoRevocado,
    prepararGuardadoManual,
    registrarGuardadoRest,
    integrarAplicacionIa,
  };
}
