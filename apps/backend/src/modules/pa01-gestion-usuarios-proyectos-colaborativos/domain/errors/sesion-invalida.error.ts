export class SesionInvalidaError extends Error {
  constructor() {
    super('La sesión no es válida o ya finalizó');
    this.name = 'SesionInvalidaError';
  }
}
