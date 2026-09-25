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

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioEntity, SesionEntity])],
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
    RegistrarCuentaUseCase,
  ],
  exports: [UsuarioRepository, PasswordHasher],
})
export class Pa01Module {}
