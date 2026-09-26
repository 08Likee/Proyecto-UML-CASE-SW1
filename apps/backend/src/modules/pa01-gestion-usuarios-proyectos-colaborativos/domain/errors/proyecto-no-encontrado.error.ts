export class ProyectoNoEncontradoError extends Error {
  constructor() {
    super('El proyecto no existe o no se encuentra disponible');

    this.name = 'ProyectoNoEncontradoError';
  }
}
