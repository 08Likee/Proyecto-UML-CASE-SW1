import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class CollaborationInternalGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expected = this.configService
      .get<string>('COLLABORATION_SERVICE_SECRET')
      ?.trim();
    const received = request.header('x-collaboration-secret')?.trim();

    if (!expected || !received) {
      throw new UnauthorizedException('Servicio colaborativo no autorizado');
    }

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new UnauthorizedException('Servicio colaborativo no autorizado');
    }

    return true;
  }
}
