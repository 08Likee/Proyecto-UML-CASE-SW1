/** Puerto separado de CU-12: la limpieza no se expone a participantes ni al controlador HTTP. */
export abstract class PurgaConversacionesRepository {
  abstract purgarLote(limite: number): Promise<number>;
}
