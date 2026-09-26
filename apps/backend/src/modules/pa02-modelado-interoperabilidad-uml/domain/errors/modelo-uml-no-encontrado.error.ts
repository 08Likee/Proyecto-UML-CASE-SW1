export class ModeloUmlNoEncontradoError extends Error {
  constructor() {
    super('El modelo UML no existe o no se encuentra disponible');
    this.name = 'ModeloUmlNoEncontradoError';
  }
}
