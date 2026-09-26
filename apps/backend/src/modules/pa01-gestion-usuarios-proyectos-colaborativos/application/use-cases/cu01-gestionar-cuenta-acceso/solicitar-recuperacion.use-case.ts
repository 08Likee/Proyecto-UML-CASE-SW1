import { Injectable } from '@nestjs/common';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { PasswordRecoveryNotifier } from '../../ports/notifications/password-recovery-notifier';
import { PasswordRecoveryTokenService } from '../../ports/security/password-recovery-token.service';

export interface SolicitarRecuperacionEntrada {
  correo: string;
}

@Injectable()
export class SolicitarRecuperacionUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly passwordRecoveryTokenService: PasswordRecoveryTokenService,
    private readonly passwordRecoveryNotifier: PasswordRecoveryNotifier,
  ) {}

  async execute(entrada: SolicitarRecuperacionEntrada): Promise<void> {
    const correo = entrada.correo.trim().toLowerCase();

    const usuario = await this.usuarioRepository.buscarPorCorreo(correo);

    /*
     * No revelamos si una cuenta existe.
     * Para un correo inexistente, la operación termina
     * exactamente igual desde la perspectiva del cliente.
     */
    if (!usuario) {
      return;
    }

    const token = await this.passwordRecoveryTokenService.generar(
      usuario.id,
      usuario.contrasenaHash,
    );

    await this.passwordRecoveryNotifier.enviar({
      correo: usuario.correo,
      nombre: usuario.nombre,
      token,
    });
  }
}
