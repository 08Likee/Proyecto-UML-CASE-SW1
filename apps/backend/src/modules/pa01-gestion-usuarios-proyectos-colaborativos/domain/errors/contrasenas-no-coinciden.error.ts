export class ContrasenasNoCoincidenError extends Error {
  constructor() {
    super('La nueva contraseña y su confirmación no coinciden');

    this.name = 'ContrasenasNoCoincidenError';
  }
}
