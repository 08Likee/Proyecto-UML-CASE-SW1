export interface TokenIdentity {
  usuarioId: string;
  sesionId: string;
}

export interface TokensGenerados {
  sesionId: string;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiraEn: Date;
}

export abstract class TokenService {
  abstract generarTokens(usuarioId: string): Promise<TokensGenerados>;

  abstract generarAccessToken(
    usuarioId: string,
    sesionId: string,
  ): Promise<string>;

  abstract verificarAccessToken(token: string): Promise<TokenIdentity>;

  abstract verificarRefreshToken(token: string): Promise<TokenIdentity>;
}
