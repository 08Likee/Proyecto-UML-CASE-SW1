import { Sha256RefreshTokenHasher } from './sha256-refresh-token-hasher';

describe('Sha256RefreshTokenHasher', () => {
  let hasher: Sha256RefreshTokenHasher;

  beforeEach(() => {
    hasher = new Sha256RefreshTokenHasher();
  });

  it('debe generar un hash SHA-256', () => {
    const hash = hasher.hash('refresh-token-de-prueba');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('debe generar el mismo hash para el mismo token', () => {
    const token = 'refresh-token-de-prueba';

    expect(hasher.hash(token)).toBe(hasher.hash(token));
  });

  it('debe generar hashes distintos para tokens distintos', () => {
    const primero = hasher.hash('token-1');
    const segundo = hasher.hash('token-2');

    expect(primero).not.toBe(segundo);
  });
});
