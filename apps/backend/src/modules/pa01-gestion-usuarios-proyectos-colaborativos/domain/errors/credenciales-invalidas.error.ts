export class CredencialesInvalidasError extends Error {
  constructor() {
    super('Las credenciales proporcionadas no son válidas');
    this.name = 'CredencialesInvalidasError';
  }
}
