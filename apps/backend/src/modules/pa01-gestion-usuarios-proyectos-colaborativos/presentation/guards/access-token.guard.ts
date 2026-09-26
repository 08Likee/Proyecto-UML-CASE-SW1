import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../../application/ports/security/token-service';

import { SesionRepository } from '../../domain/repositories/sesion.repository';

export interface AuthenticatedRequest extends Request {
  usuarioId?: string;
  sesionId?: string;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sesionRepository: SesionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Se requiere autenticación');
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de acceso inválido');
    }

    try {
      const identidad = await this.tokenService.verificarAccessToken(token);

      const sesion = await this.sesionRepository.buscarPorId(
        identidad.sesionId,
      );

      const ahora = Date.now();

      if (
        !sesion ||
        sesion.idUsuario !== identidad.usuarioId ||
        sesion.fechaRevocacion !== null ||
        sesion.fechaExpiracion.getTime() <= ahora
      ) {
        throw new Error('Sesión inválida');
      }

      request.usuarioId = identidad.usuarioId;
      request.sesionId = identidad.sesionId;

      return true;
    } catch {
      throw new UnauthorizedException('Token de acceso inválido o expirado');
    }
  }
}
