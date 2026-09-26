import { create } from 'zustand';
import type {
  AtributoUml,
  ClaseUml,
  ModeloUml,
  OperacionUml,
  ParametroUml,
  RelacionUml,
  TipoRelacionUml,
} from './modelo-uml.types';

export type ElementoSeleccionado =
  | { tipo: 'CLASE'; id: string }
  | { tipo: 'RELACION'; id: string }
  | null;

interface ModeladorState {
  modelo: ModeloUml | null;
  seleccionado: ElementoSeleccionado;
  sucio: boolean;
  cargarModelo: (modelo: ModeloUml) => void;
  marcarGuardado: (modelo: ModeloUml) => void;
  seleccionar: (seleccionado: ElementoSeleccionado) => void;
  actualizarMetadatos: (nombre: string, descripcion: string | null) => void;
  agregarClase: () => void;
  moverClase: (idClase: string, x: number, y: number) => void;
  actualizarClase: (idClase: string, cambios: Partial<Pick<ClaseUml, 'nombre'>>) => void;
  eliminarClase: (idClase: string) => void;
  agregarAtributo: (idClase: string) => void;
  actualizarAtributo: (
    idClase: string,
    idAtributo: string,
    cambios: Partial<Omit<AtributoUml, 'id'>>,
  ) => void;
  eliminarAtributo: (idClase: string, idAtributo: string) => void;
  configurarPersistencia: (
    idClase: string,
    persistente: boolean,
    idAtributoIdentificador: string | null,
  ) => void;
  agregarOperacion: (idClase: string) => void;
  actualizarOperacion: (
    idClase: string,
    idOperacion: string,
    cambios: Partial<Omit<OperacionUml, 'id' | 'parametros'>>,
  ) => void;
  eliminarOperacion: (idClase: string, idOperacion: string) => void;
  agregarParametro: (idClase: string, idOperacion: string) => void;
  actualizarParametro: (
    idClase: string,
    idOperacion: string,
    idParametro: string,
    cambios: Partial<Omit<ParametroUml, 'id'>>,
  ) => void;
  eliminarParametro: (
    idClase: string,
    idOperacion: string,
    idParametro: string,
  ) => void;
  agregarRelacion: (idClaseOrigen: string, idClaseDestino: string) => void;
  actualizarRelacion: (
    idRelacion: string,
    cambios: Partial<Omit<RelacionUml, 'id'>>,
  ) => void;
  cambiarTipoRelacion: (idRelacion: string, tipo: TipoRelacionUml) => void;
  eliminarRelacion: (idRelacion: string) => void;
}

function conModelo(
  state: ModeladorState,
  transformar: (modelo: ModeloUml) => ModeloUml,
): Partial<ModeladorState> {
  if (!state.modelo) {
    return {};
  }

  return {
    modelo: transformar(state.modelo),
    sucio: true,
  };
}

function actualizarClaseEnModelo(
  modelo: ModeloUml,
  idClase: string,
  transformar: (clase: ClaseUml) => ClaseUml,
): ModeloUml {
  return {
    ...modelo,
    contenido: {
      ...modelo.contenido,
      clases: modelo.contenido.clases.map((clase) =>
        clase.id === idClase ? transformar(clase) : clase,
      ),
    },
  };
}

function actualizarOperacionEnClase(
  clase: ClaseUml,
  idOperacion: string,
  transformar: (operacion: OperacionUml) => OperacionUml,
): ClaseUml {
  return {
    ...clase,
    operaciones: clase.operaciones.map((operacion) =>
      operacion.id === idOperacion ? transformar(operacion) : operacion,
    ),
  };
}

export const useModeladorStore = create<ModeladorState>((set) => ({
  modelo: null,
  seleccionado: null,
  sucio: false,

  cargarModelo: (modelo) =>
    set({ modelo, seleccionado: null, sucio: false }),

  marcarGuardado: (modelo) => set({ modelo, sucio: false }),

  seleccionar: (seleccionado) => set({ seleccionado }),

  actualizarMetadatos: (nombre, descripcion) =>
    set((state) =>
      conModelo(state, (modelo) => ({
        ...modelo,
        nombre,
        descripcion,
      })),
    ),

  agregarClase: () =>
    set((state) => {
      if (!state.modelo) {
        return {};
      }

      const id = crypto.randomUUID();
      const offset = state.modelo.contenido.clases.length * 35;
      const nueva: ClaseUml = {
        id,
        nombre: `Clase${state.modelo.contenido.clases.length + 1}`,
        atributos: [],
        operaciones: [],
        posicion: { x: 80 + offset, y: 80 + offset },
        persistencia: {
          persistente: false,
          idAtributoIdentificador: null,
        },
      };

      return {
        modelo: {
          ...state.modelo,
          contenido: {
            ...state.modelo.contenido,
            clases: [...state.modelo.contenido.clases, nueva],
          },
        },
        seleccionado: { tipo: 'CLASE', id },
        sucio: true,
      };
    }),

  moverClase: (idClase, x, y) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          posicion: { x, y },
        })),
      ),
    ),

  actualizarClase: (idClase, cambios) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          ...cambios,
        })),
      ),
    ),

  eliminarClase: (idClase) =>
    set((state) => {
      if (!state.modelo) {
        return {};
      }

      return {
        modelo: {
          ...state.modelo,
          contenido: {
            ...state.modelo.contenido,
            clases: state.modelo.contenido.clases.filter(
              (clase) => clase.id !== idClase,
            ),
            relaciones: state.modelo.contenido.relaciones.filter(
              (relacion) =>
                relacion.idClaseOrigen !== idClase &&
                relacion.idClaseDestino !== idClase,
            ),
          },
        },
        seleccionado: null,
        sucio: true,
      };
    }),

  agregarAtributo: (idClase) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          atributos: [
            ...clase.atributos,
            {
              id: crypto.randomUUID(),
              nombre: 'atributo',
              tipo: 'String',
              visibilidad: 'PRIVADA',
            },
          ],
        })),
      ),
    ),

  actualizarAtributo: (idClase, idAtributo, cambios) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          atributos: clase.atributos.map((atributo) =>
            atributo.id === idAtributo
              ? { ...atributo, ...cambios }
              : atributo,
          ),
        })),
      ),
    ),

  eliminarAtributo: (idClase, idAtributo) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          atributos: clase.atributos.filter(
            (atributo) => atributo.id !== idAtributo,
          ),
          persistencia: {
            ...clase.persistencia,
            idAtributoIdentificador:
              clase.persistencia.idAtributoIdentificador === idAtributo
                ? null
                : clase.persistencia.idAtributoIdentificador,
          },
        })),
      ),
    ),

  configurarPersistencia: (
    idClase,
    persistente,
    idAtributoIdentificador,
  ) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          persistencia: {
            persistente,
            idAtributoIdentificador: persistente
              ? idAtributoIdentificador
              : null,
          },
        })),
      ),
    ),

  agregarOperacion: (idClase) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          operaciones: [
            ...clase.operaciones,
            {
              id: crypto.randomUUID(),
              nombre: 'operacion',
              visibilidad: 'PUBLICA',
              parametros: [],
              tipoRetorno: null,
            },
          ],
        })),
      ),
    ),

  actualizarOperacion: (idClase, idOperacion, cambios) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) =>
          actualizarOperacionEnClase(clase, idOperacion, (operacion) => ({
            ...operacion,
            ...cambios,
          })),
        ),
      ),
    ),

  eliminarOperacion: (idClase, idOperacion) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) => ({
          ...clase,
          operaciones: clase.operaciones.filter(
            (operacion) => operacion.id !== idOperacion,
          ),
        })),
      ),
    ),

  agregarParametro: (idClase, idOperacion) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) =>
          actualizarOperacionEnClase(clase, idOperacion, (operacion) => ({
            ...operacion,
            parametros: [
              ...operacion.parametros,
              {
                id: crypto.randomUUID(),
                nombre: 'parametro',
                tipo: 'String',
              },
            ],
          })),
        ),
      ),
    ),

  actualizarParametro: (
    idClase,
    idOperacion,
    idParametro,
    cambios,
  ) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) =>
          actualizarOperacionEnClase(clase, idOperacion, (operacion) => ({
            ...operacion,
            parametros: operacion.parametros.map((parametro) =>
              parametro.id === idParametro
                ? { ...parametro, ...cambios }
                : parametro,
            ),
          })),
        ),
      ),
    ),

  eliminarParametro: (idClase, idOperacion, idParametro) =>
    set((state) =>
      conModelo(state, (modelo) =>
        actualizarClaseEnModelo(modelo, idClase, (clase) =>
          actualizarOperacionEnClase(clase, idOperacion, (operacion) => ({
            ...operacion,
            parametros: operacion.parametros.filter(
              (parametro) => parametro.id !== idParametro,
            ),
          })),
        ),
      ),
    ),

  agregarRelacion: (idClaseOrigen, idClaseDestino) =>
    set((state) => {
      if (!state.modelo) {
        return {};
      }

      const id = crypto.randomUUID();
      const nueva: RelacionUml = {
        id,
        tipo: 'ASOCIACION',
        idClaseOrigen,
        idClaseDestino,
        nombre: null,
        multiplicidadOrigen: '1',
        multiplicidadDestino: '1',
      };

      return {
        modelo: {
          ...state.modelo,
          contenido: {
            ...state.modelo.contenido,
            relaciones: [...state.modelo.contenido.relaciones, nueva],
          },
        },
        seleccionado: { tipo: 'RELACION', id },
        sucio: true,
      };
    }),

  actualizarRelacion: (idRelacion, cambios) =>
    set((state) =>
      conModelo(state, (modelo) => ({
        ...modelo,
        contenido: {
          ...modelo.contenido,
          relaciones: modelo.contenido.relaciones.map((relacion) =>
            relacion.id === idRelacion
              ? { ...relacion, ...cambios }
              : relacion,
          ),
        },
      })),
    ),

  cambiarTipoRelacion: (idRelacion, tipo) =>
    set((state) =>
      conModelo(state, (modelo) => ({
        ...modelo,
        contenido: {
          ...modelo.contenido,
          relaciones: modelo.contenido.relaciones.map((relacion) => {
            if (relacion.id !== idRelacion) {
              return relacion;
            }

            return {
              ...relacion,
              tipo,
              multiplicidadOrigen:
                tipo === 'GENERALIZACION'
                  ? null
                  : relacion.multiplicidadOrigen ?? '1',
              multiplicidadDestino:
                tipo === 'GENERALIZACION'
                  ? null
                  : relacion.multiplicidadDestino ?? '1',
            };
          }),
        },
      })),
    ),

  eliminarRelacion: (idRelacion) =>
    set((state) => {
      if (!state.modelo) {
        return {};
      }

      return {
        modelo: {
          ...state.modelo,
          contenido: {
            ...state.modelo.contenido,
            relaciones: state.modelo.contenido.relaciones.filter(
              (relacion) => relacion.id !== idRelacion,
            ),
          },
        },
        seleccionado: null,
        sucio: true,
      };
    }),
}));
