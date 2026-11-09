export type CodigoErrorProveedorIa =
  | 'NO_CONFIGURADO'
  | 'SOLICITUD_INVALIDA'
  | 'CREDENCIALES_RECHAZADAS'
  | 'CUOTA_AGOTADA'
  | 'NO_DISPONIBLE'
  | 'TIEMPO_AGOTADO'
  | 'RESPUESTA_INVALIDA';

const mensajes: Record<CodigoErrorProveedorIa, string> = {
  NO_CONFIGURADO: 'El proveedor de IA no esta configurado.',
  SOLICITUD_INVALIDA: 'La solicitud al proveedor de IA no es valida.',
  CREDENCIALES_RECHAZADAS: 'El proveedor de IA rechazo las credenciales.',
  CUOTA_AGOTADA: 'El proveedor de IA alcanzo su limite de uso.',
  NO_DISPONIBLE: 'El proveedor de IA no esta disponible temporalmente.',
  TIEMPO_AGOTADO: 'El proveedor de IA excedio el tiempo de espera.',
  RESPUESTA_INVALIDA: 'El proveedor de IA devolvio una respuesta invalida.',
};

/** No conserva respuestas HTTP, solicitudes ni secretos del proveedor. */
export class ErrorProveedorIa extends Error {
  constructor(public readonly codigo: CodigoErrorProveedorIa) {
    super(mensajes[codigo]);
    this.name = 'ErrorProveedorIa';
  }
}
