export class ContrasenaActualInvalidaError extends Error {
  constructor() {
    super('La contraseña actual no es válida');

    this.name = 'ContrasenaActualInvalidaError';
  }
}
