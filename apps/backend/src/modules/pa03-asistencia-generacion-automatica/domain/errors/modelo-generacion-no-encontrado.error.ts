export class ModeloGeneracionNoEncontradoError extends Error {
  constructor() {
    super('El modelo UML solicitado no existe o no se encuentra disponible');
    this.name = ModeloGeneracionNoEncontradoError.name;
  }
}
