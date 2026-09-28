import type { ResultadoValidacionGeneracion } from '../models/generacion-backend';

export class ModeloNoGenerableError extends Error {
  constructor(public readonly resultado: ResultadoValidacionGeneracion) {
    super('El modelo UML contiene errores que impiden generar el backend');
    this.name = ModeloNoGenerableError.name;
  }
}
