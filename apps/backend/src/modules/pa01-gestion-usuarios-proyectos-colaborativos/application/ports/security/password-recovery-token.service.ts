export interface PasswordRecoveryTokenIdentity {
  usuarioId: string;
  contrasenaHuella: string;
}

export abstract class PasswordRecoveryTokenService {
  abstract generar(usuarioId: string, contrasenaHash: string): Promise<string>;

  abstract verificar(token: string): Promise<PasswordRecoveryTokenIdentity>;

  abstract coincideContrasenaActual(
    contrasenaHuella: string,
    contrasenaHashActual: string,
  ): boolean;
}
