import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../ports/security/password-hasher';
import { ContrasenaActualInvalidaError } from '../../../domain/errors/contrasena-actual-invalida.error';
import { ContrasenasNoCoincidenError } from '../../../domain/errors/contrasenas-no-coinciden.error';
import { UsuarioNoEncontradoError } from '../../../domain/errors/usuario-no-encontrado.error';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';

export interface CambiarContrasenaEntrada {
  idUsuario: string;
  contrasenaActual: string;
  nuevaContrasena: string;
  confirmacionContrasena: string;
}

@Injectable()
export class CambiarContrasenaUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(entrada: CambiarContrasenaEntrada): Promise<void> {
    if (entrada.nuevaContrasena !== entrada.confirmacionContrasena) {
      throw new ContrasenasNoCoincidenError();
    }

    const usuario = await this.usuarioRepository.buscarPorId(entrada.idUsuario);

    if (!usuario) {
      throw new UsuarioNoEncontradoError();
    }

    const contrasenaActualValida = await this.passwordHasher.verify(
      entrada.contrasenaActual,
      usuario.contrasenaHash,
    );

    if (!contrasenaActualValida) {
      throw new ContrasenaActualInvalidaError();
    }

    const nuevaContrasenaHash = await this.passwordHasher.hash(
      entrada.nuevaContrasena,
    );

    const actualizado =
      await this.usuarioRepository.actualizarContrasenaSiCoincide(
        usuario.id,
        usuario.contrasenaHash,
        nuevaContrasenaHash,
      );

    if (!actualizado) {
      throw new ContrasenaActualInvalidaError();
    }
  }
}
