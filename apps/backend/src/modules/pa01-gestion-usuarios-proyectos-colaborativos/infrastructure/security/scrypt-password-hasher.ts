import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { PasswordHasher } from '../../application/ports/security/password-hasher';

@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  private static readonly algorithm = 'scrypt';
  private static readonly cost = 16384;
  private static readonly blockSize = 8;
  private static readonly parallelization = 1;
  private static readonly saltLength = 16;
  private static readonly keyLength = 64;
  private static readonly maxMemory = 64 * 1024 * 1024;

  async hash(password: string): Promise<string> {
    const salt = randomBytes(ScryptPasswordHasher.saltLength);

    const derivedKey = await this.deriveKey(password, salt);

    return [
      ScryptPasswordHasher.algorithm,
      ScryptPasswordHasher.cost,
      ScryptPasswordHasher.blockSize,
      ScryptPasswordHasher.parallelization,
      salt.toString('base64'),
      derivedKey.toString('base64'),
    ].join('$');
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');

    if (parts.length !== 6) {
      return false;
    }

    const [
      algorithm,
      cost,
      blockSize,
      parallelization,
      saltBase64,
      hashBase64,
    ] = parts;

    if (
      algorithm !== ScryptPasswordHasher.algorithm ||
      Number(cost) !== ScryptPasswordHasher.cost ||
      Number(blockSize) !== ScryptPasswordHasher.blockSize ||
      Number(parallelization) !== ScryptPasswordHasher.parallelization
    ) {
      return false;
    }

    try {
      const salt = Buffer.from(saltBase64, 'base64');
      const expectedHash = Buffer.from(hashBase64, 'base64');

      if (
        salt.length !== ScryptPasswordHasher.saltLength ||
        expectedHash.length !== ScryptPasswordHasher.keyLength
      ) {
        return false;
      }

      const actualHash = await this.deriveKey(password, salt);

      return timingSafeEqual(expectedHash, actualHash);
    } catch {
      return false;
    }
  }

  private deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      nodeScrypt(
        password,
        salt,
        ScryptPasswordHasher.keyLength,
        {
          N: ScryptPasswordHasher.cost,
          r: ScryptPasswordHasher.blockSize,
          p: ScryptPasswordHasher.parallelization,
          maxmem: ScryptPasswordHasher.maxMemory,
        },
        (error, derivedKey) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(derivedKey);
        },
      );
    });
  }
}
