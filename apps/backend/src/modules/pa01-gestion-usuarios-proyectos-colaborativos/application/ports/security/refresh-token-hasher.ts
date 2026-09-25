export abstract class RefreshTokenHasher {
  abstract hash(token: string): string;
}
