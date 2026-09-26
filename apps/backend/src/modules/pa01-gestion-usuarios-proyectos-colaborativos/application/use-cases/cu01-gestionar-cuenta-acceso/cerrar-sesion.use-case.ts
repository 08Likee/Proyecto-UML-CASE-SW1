import { Injectable } from '@nestjs/common';
import { SesionInvalidaError } from '../../../domain/errors/sesion-invalida.error';
import { SesionRepository } from '../../../domain/repositories/sesion.repository';
import { RefreshTokenHasher } from '../../ports/security/refresh-token-hasher';
import { TokenService } from '../../ports/security/token-service';

@Injectable()
export class CerrarSesionUseCase {
  constructor(
    private readonly sesionRepository: SesionRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTokenHasher: RefreshTokenHasher,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    let identidad: {
      usuarioId: string;
      sesionId: string;
    };

    try {
      identidad = await this.tokenService.verificarRefreshToken(refreshToken);
    } catch {
      throw new SesionInvalidaError();
    }

    const refreshTokenHash = this.refreshTokenHasher.hash(refreshToken);

    const sesion =
      await this.sesionRepository.buscarPorRefreshTokenHash(refreshTokenHash);

    const ahora = new Date();

    if (
      !sesion ||
      sesion.id !== identidad.sesionId ||
      sesion.idUsuario !== identidad.usuarioId ||
      sesion.fechaRevocacion !== null ||
      sesion.fechaExpiracion.getTime() <= ahora.getTime()
    ) {
      throw new SesionInvalidaError();
    }

    await this.sesionRepository.revocar(sesion.id, ahora);
  }
}
