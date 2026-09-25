export interface TokensGenerados {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiraEn: Date;
}

export abstract class TokenService {
  abstract generarTokens(usuarioId: string): Promise<TokensGenerados>;

  abstract verificarAccessToken(token: string): Promise<string>;

  abstract verificarRefreshToken(token: string): Promise<string>;
}
