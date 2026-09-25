export class CorreoYaRegistradoError extends Error {
  constructor() {
    super('El correo ya se encuentra registrado');
    this.name = 'CorreoYaRegistradoError';
  }
}
