import { Injectable } from '@nestjs/common';
import { SesionInvalidaError } from '../../../domain/errors/sesion-invalida.error';
import { SesionRepository } from '../../../domain/repositories/sesion.repository';
import { RefreshTokenHasher } from '../../ports/security/refresh-token-hasher';
import {
  TokenService,
  type TokenIdentity,
} from '../../ports/security/token-service';

export interface RenovarAccesoResultado {
  accessToken: string;
}

@Injectable()
export class RenovarAccesoUseCase {
  constructor(
    private readonly sesionRepository: SesionRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTokenHasher: RefreshTokenHasher,
  ) {}

  async execute(refreshToken: string): Promise<RenovarAccesoResultado> {
    let identidad: TokenIdentity;

    try {
      identidad = await this.tokenService.verificarRefreshToken(refreshToken);
    } catch {
      throw new SesionInvalidaError();
    }

    const refreshTokenHash = this.refreshTokenHasher.hash(refreshToken);

    const sesion =
      await this.sesionRepository.buscarPorRefreshTokenHash(refreshTokenHash);

    const ahora = Date.now();

    if (
      !sesion ||
      sesion.id !== identidad.sesionId ||
      sesion.idUsuario !== identidad.usuarioId ||
      sesion.fechaRevocacion !== null ||
      sesion.fechaExpiracion.getTime() <= ahora
    ) {
      throw new SesionInvalidaError();
    }

    const accessToken = await this.tokenService.generarAccessToken(
      identidad.usuarioId,
      identidad.sesionId,
    );

    return {
      accessToken,
    };
  }
}
