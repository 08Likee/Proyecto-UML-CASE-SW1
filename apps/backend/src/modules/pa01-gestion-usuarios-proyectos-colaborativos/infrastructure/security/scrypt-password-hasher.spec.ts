import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  let hasher: ScryptPasswordHasher;

  beforeEach(() => {
    hasher = new ScryptPasswordHasher();
  });

  it('debe generar un hash diferente de la contraseña original', async () => {
    const password = 'ClaveSegura123!';

    const hash = await hasher.hash(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('debe generar hashes distintos para la misma contraseña', async () => {
    const password = 'ClaveSegura123!';

    const firstHash = await hasher.hash(password);
    const secondHash = await hasher.hash(password);

    expect(firstHash).not.toBe(secondHash);
  });

  it('debe validar una contraseña correcta', async () => {
    const password = 'ClaveSegura123!';
    const hash = await hasher.hash(password);

    const result = await hasher.verify(password, hash);

    expect(result).toBe(true);
  });

  it('debe rechazar una contraseña incorrecta', async () => {
    const hash = await hasher.hash('ClaveSegura123!');

    const result = await hasher.verify('ClaveIncorrecta123!', hash);

    expect(result).toBe(false);
  });

  it('debe rechazar un hash con formato inválido', async () => {
    const result = await hasher.verify('ClaveSegura123!', 'hash-invalido');

    expect(result).toBe(false);
  });
});
