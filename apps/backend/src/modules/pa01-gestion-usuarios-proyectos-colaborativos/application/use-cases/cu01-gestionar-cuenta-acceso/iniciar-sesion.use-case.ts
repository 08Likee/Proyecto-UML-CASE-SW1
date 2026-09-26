import { Injectable } from '@nestjs/common';
import { CredencialesInvalidasError } from '../../../domain/errors/credenciales-invalidas.error';
import { SesionRepository } from '../../../domain/repositories/sesion.repository';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { PasswordHasher } from '../../ports/security/password-hasher';
import { RefreshTokenHasher } from '../../ports/security/refresh-token-hasher';
import { TokenService } from '../../ports/security/token-service';

export interface IniciarSesionEntrada {
  correo: string;
  contrasena: string;
  dispositivo?: string | null;
}

export interface IniciarSesionResultado {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    correo: string;
    fotoPerfil: string | null;
  };
}

@Injectable()
export class IniciarSesionUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly sesionRepository: SesionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTokenHasher: RefreshTokenHasher,
  ) {}

  async execute(
    entrada: IniciarSesionEntrada,
  ): Promise<IniciarSesionResultado> {
    const correoNormalizado = entrada.correo.trim().toLowerCase();

    const usuario =
      await this.usuarioRepository.buscarPorCorreo(correoNormalizado);

    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new CredencialesInvalidasError();
    }

    const contrasenaValida = await this.passwordHasher.verify(
      entrada.contrasena,
      usuario.contrasenaHash,
    );

    if (!contrasenaValida) {
      throw new CredencialesInvalidasError();
    }

    const tokens = await this.tokenService.generarTokens(usuario.id);

    const refreshTokenHash = this.refreshTokenHasher.hash(tokens.refreshToken);

    await this.sesionRepository.crear({
      id: tokens.sesionId,
      refreshTokenHash,
      fechaExpiracion: tokens.refreshTokenExpiraEn,
      dispositivo: entrada.dispositivo ?? null,
      idUsuario: usuario.id,
    });

    await this.usuarioRepository.actualizarUltimaConexion(
      usuario.id,
      new Date(),
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        fotoPerfil: usuario.fotoPerfil,
      },
    };
  }
}
