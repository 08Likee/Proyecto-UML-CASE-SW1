export class RecuperacionInvalidaError extends Error {
  constructor() {
    super(
      'El mecanismo de recuperación no es válido o ya no se encuentra vigente',
    );

    this.name = 'RecuperacionInvalidaError';
  }
}
