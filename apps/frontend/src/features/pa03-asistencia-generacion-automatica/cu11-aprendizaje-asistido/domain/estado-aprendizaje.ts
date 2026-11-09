export interface PosicionAprendizaje {
  x: number;
  y: number;
}

export interface EstadoAprendizaje {
  abierto: boolean;
  idGuia: string | null;
  indicePaso: number;
  ayudaVisible: boolean;
  finalizada: boolean;
  aviso: string | null;
  posicionPanel: PosicionAprendizaje | null;
  /** Pasos que ya mostraron señalización automática durante este recorrido. */
  pasosAutoSenalados: readonly string[];
}

export const ESTADO_APRENDIZAJE_INICIAL: EstadoAprendizaje = {
  abierto: false,
  idGuia: null,
  indicePaso: 0,
  ayudaVisible: false,
  finalizada: false,
  aviso: null,
  posicionPanel: null,
  pasosAutoSenalados: [],
};
