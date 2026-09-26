import { Injectable } from '@nestjs/common';
import { RecuperacionCuentaRepository } from '../../ports/persistence/recuperacion-cuenta.repository';
import { PasswordHasher } from '../../ports/security/password-hasher';
import { PasswordRecoveryTokenService } from '../../ports/security/password-recovery-token.service';
import { ContrasenasNoCoincidenError } from '../../../domain/errors/contrasenas-no-coinciden.error';
import { RecuperacionInvalidaError } from '../../../domain/errors/recuperacion-invalida.error';

export interface ConfirmarRecuperacionEntrada {
  token: string;
  nuevaContrasena: string;
  confirmacionContrasena: string;
}

@Injectable()
export class ConfirmarRecuperacionUseCase {
  constructor(
    private readonly recuperacionCuentaRepository: RecuperacionCuentaRepository,
    private readonly passwordRecoveryTokenService: PasswordRecoveryTokenService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(entrada: ConfirmarRecuperacionEntrada): Promise<void> {
    if (entrada.nuevaContrasena !== entrada.confirmacionContrasena) {
      throw new ContrasenasNoCoincidenError();
    }

    let identidad;

    try {
      identidad = await this.passwordRecoveryTokenService.verificar(
        entrada.token,
      );
    } catch {
      throw new RecuperacionInvalidaError();
    }

    const contrasenaHashActual =
      await this.recuperacionCuentaRepository.buscarContrasenaHashPorUsuarioId(
        identidad.usuarioId,
      );

    if (!contrasenaHashActual) {
      throw new RecuperacionInvalidaError();
    }

    const coincide = this.passwordRecoveryTokenService.coincideContrasenaActual(
      identidad.contrasenaHuella,
      contrasenaHashActual,
    );

    if (!coincide) {
      throw new RecuperacionInvalidaError();
    }

    const nuevaContrasenaHash = await this.passwordHasher.hash(
      entrada.nuevaContrasena,
    );

    const actualizado =
      await this.recuperacionCuentaRepository.actualizarContrasenaYRevocarSesiones(
        {
          idUsuario: identidad.usuarioId,
          contrasenaHashActual,
          nuevaContrasenaHash,
          fechaRevocacion: new Date(),
        },
      );

    if (!actualizado) {
      throw new RecuperacionInvalidaError();
    }
  }
}
