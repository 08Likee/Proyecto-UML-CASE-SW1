import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioRepository } from './domain/repositories/usuario.repository';
import { SesionEntity } from './infrastructure/persistence/entities/sesion.entity';
import { UsuarioEntity } from './infrastructure/persistence/entities/usuario.entity';
import { TypeOrmUsuarioRepository } from './infrastructure/persistence/repositories/typeorm-usuario.repository';

import { PasswordHasher } from './application/ports/security/password-hasher';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher';

import { RegistrarCuentaUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/registrar-cuenta.use-case';

import { AuthController } from './presentation/controllers/auth.controller';

import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './application/ports/security/token-service';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';

import { RefreshTokenHasher } from './application/ports/security/refresh-token-hasher';
import { SesionRepository } from './domain/repositories/sesion.repository';
import { TypeOrmSesionRepository } from './infrastructure/persistence/repositories/typeorm-sesion.repository';
import { Sha256RefreshTokenHasher } from './infrastructure/security/sha256-refresh-token-hasher';

import { IniciarSesionUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/iniciar-sesion.use-case';

import { AccessTokenGuard } from './presentation/guards/access-token.guard';

import { CerrarSesionUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/cerrar-sesion.use-case';

import { RenovarAccesoUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/renovar-acceso.use-case';
@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioEntity, SesionEntity]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: UsuarioRepository,
      useClass: TypeOrmUsuarioRepository,
    },
    {
      provide: PasswordHasher,
      useClass: ScryptPasswordHasher,
    },
    {
      provide: TokenService,
      useClass: JwtTokenService,
    },
    RegistrarCuentaUseCase,
    {
      provide: SesionRepository,
      useClass: TypeOrmSesionRepository,
    },
    {
      provide: RefreshTokenHasher,
      useClass: Sha256RefreshTokenHasher,
    },
    IniciarSesionUseCase,
    AccessTokenGuard,
    CerrarSesionUseCase,
    RenovarAccesoUseCase,
  ],
  exports: [UsuarioRepository, PasswordHasher, TokenService],
})
export class Pa01Module {}
