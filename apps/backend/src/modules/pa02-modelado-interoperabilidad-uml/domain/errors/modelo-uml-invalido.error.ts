export class ModeloUmlInvalidoError extends Error {
  constructor(
    message = 'El contenido del modelo UML no es válido',
    readonly campo?: string,
  ) {
    super(message);
    this.name = 'ModeloUmlInvalidoError';
  }
}
