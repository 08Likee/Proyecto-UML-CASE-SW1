import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PasswordRecoveryNotifier,
  type PasswordRecoveryNotification,
} from '../../application/ports/notifications/password-recovery-notifier';

@Injectable()
export class ConsolePasswordRecoveryNotifier extends PasswordRecoveryNotifier {
  private readonly logger = new Logger(ConsolePasswordRecoveryNotifier.name);

  private readonly clientUrl: string;

  constructor(configService: ConfigService) {
    super();

    const clientUrl = configService.get<string>('CLIENT_URL');

    if (!clientUrl) {
      throw new Error('CLIENT_URL no está configurado');
    }

    this.clientUrl = clientUrl;
  }

  async enviar(datos: PasswordRecoveryNotification): Promise<void> {
    const url = new URL('/recuperar-contrasena', this.clientUrl);

    url.searchParams.set('token', datos.token);

    this.logger.log(
      [
        'Recuperación de contraseña solicitada.',
        `Destinatario: ${datos.correo}`,
        `Enlace: ${url.toString()}`,
      ].join(' '),
    );
  }
}
