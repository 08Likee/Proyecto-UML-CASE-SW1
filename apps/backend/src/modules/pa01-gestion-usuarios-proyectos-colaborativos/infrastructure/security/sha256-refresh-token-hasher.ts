import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RefreshTokenHasher } from '../../application/ports/security/refresh-token-hasher';

@Injectable()
export class Sha256RefreshTokenHasher implements RefreshTokenHasher {
  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
