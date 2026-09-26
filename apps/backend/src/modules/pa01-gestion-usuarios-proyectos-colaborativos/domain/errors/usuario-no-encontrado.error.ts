export class UsuarioNoEncontradoError extends Error {
  constructor() {
    super('El usuario no existe');

    this.name = 'UsuarioNoEncontradoError';
  }
}
