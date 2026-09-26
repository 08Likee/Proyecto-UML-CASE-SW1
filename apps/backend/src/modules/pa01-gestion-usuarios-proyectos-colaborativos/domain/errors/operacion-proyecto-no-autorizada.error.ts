export class OperacionProyectoNoAutorizadaError extends Error {
  constructor() {
    super(
      'El usuario no posee autorización para realizar esta operación sobre el proyecto',
    );

    this.name = 'OperacionProyectoNoAutorizadaError';
  }
}
