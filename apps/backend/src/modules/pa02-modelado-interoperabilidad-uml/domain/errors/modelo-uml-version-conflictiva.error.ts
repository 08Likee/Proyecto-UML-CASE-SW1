export class ModeloUmlVersionConflictivaError extends Error {
  constructor() {
    super(
      'El modelo UML fue modificado desde la última versión conocida; recárgalo antes de guardar nuevamente',
    );
    this.name = 'ModeloUmlVersionConflictivaError';
  }
}
