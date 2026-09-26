export interface PasswordRecoveryNotification {
  correo: string;
  nombre: string;
  token: string;
}

export abstract class PasswordRecoveryNotifier {
  abstract enviar(datos: PasswordRecoveryNotification): Promise<void>;
}
