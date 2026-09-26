import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  PasswordRecoveryNotifier,
  type PasswordRecoveryNotification,
} from '../../application/ports/notifications/password-recovery-notifier';

@Injectable()
export class SmtpPasswordRecoveryNotifier extends PasswordRecoveryNotifier {
  private readonly transporter: Transporter;

  private readonly from: string;

  private readonly clientUrl: string;

  constructor(configService: ConfigService) {
    super();

    const host = configService.get<string>('SMTP_HOST');

    const port = Number(configService.get<string>('SMTP_PORT'));

    const secure = configService.get<string>('SMTP_SECURE') === 'true';

    const user = configService.get<string>('SMTP_USER');

    const password = configService.get<string>('SMTP_PASSWORD');

    const from = configService.get<string>('SMTP_FROM');

    const clientUrl = configService.get<string>('CLIENT_URL');

    if (!host) {
      throw new Error('SMTP_HOST no está configurado');
    }

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('SMTP_PORT debe ser un entero positivo');
    }

    if (!user) {
      throw new Error('SMTP_USER no está configurado');
    }

    if (!password) {
      throw new Error('SMTP_PASSWORD no está configurado');
    }

    if (!from) {
      throw new Error('SMTP_FROM no está configurado');
    }

    if (!clientUrl) {
      throw new Error('CLIENT_URL no está configurado');
    }

    this.from = from;
    this.clientUrl = clientUrl;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    });
  }

  async enviar(datos: PasswordRecoveryNotification): Promise<void> {
    const url = new URL('/recuperar-contrasena', this.clientUrl);

    url.searchParams.set('token', datos.token);

    await this.transporter.sendMail({
      from: this.from,
      to: datos.correo,
      subject: 'Recuperación de contraseña',
      text: [
        `Hola ${datos.nombre},`,
        '',
        'Recibimos una solicitud para recuperar el acceso a tu cuenta.',
        '',
        `Establece una nueva contraseña utilizando el siguiente enlace:`,
        url.toString(),
        '',
        'Este enlace tiene una vigencia limitada.',
        '',
        'Si no realizaste esta solicitud, puedes ignorar este mensaje.',
      ].join('\n'),
    });
  }
}
