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

import { ConfigService } from '@nestjs/config';
import { SolicitarRecuperacionUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/solicitar-recuperacion.use-case';
import { PasswordRecoveryNotifier } from './application/ports/notifications/password-recovery-notifier';
import { PasswordRecoveryTokenService } from './application/ports/security/password-recovery-token.service';
import { ConsolePasswordRecoveryNotifier } from './infrastructure/notifications/console-password-recovery-notifier';
import { SmtpPasswordRecoveryNotifier } from './infrastructure/notifications/smtp-password-recovery-notifier';
import { JwtPasswordRecoveryTokenService } from './infrastructure/security/jwt-password-recovery-token.service';

import { RecuperacionCuentaRepository } from './application/ports/persistence/recuperacion-cuenta.repository';
import { ConfirmarRecuperacionUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/confirmar-recuperacion.use-case';
import { TypeOrmRecuperacionCuentaRepository } from './infrastructure/persistence/repositories/typeorm-recuperacion-cuenta.repository';

import { ModificarPerfilUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/modificar-perfil.use-case';

import { ObtenerPerfilUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/obtener-perfil.use-case';

import { CambiarContrasenaUseCase } from './application/use-cases/cu01-gestionar-cuenta-acceso/cambiar-contrasena.use-case';

import { ProyectoRepository } from './domain/repositories/proyecto.repository';
import { ProyectoEntity } from './infrastructure/persistence/entities/proyecto.entity';
import { RolEntity } from './infrastructure/persistence/entities/rol.entity';
import { MembresiaEntity } from './infrastructure/persistence/entities/membresia.entity';
import { TypeOrmProyectoRepository } from './infrastructure/persistence/repositories/typeorm-proyecto.repository';
import { CrearProyectoUseCase } from './application/use-cases/cu02-gestionar-proyecto-colaborativo/crear-proyecto.use-case';
import { ProyectosController } from './presentation/controllers/proyectos.controller';

import { ListarProyectosUseCase } from './application/use-cases/cu02-gestionar-proyecto-colaborativo/listar-proyectos.use-case';
import { ModificarProyectoUseCase } from './application/use-cases/cu02-gestionar-proyecto-colaborativo/modificar-proyecto.use-case';
import { ObtenerProyectoUseCase } from './application/use-cases/cu02-gestionar-proyecto-colaborativo/obtener-proyecto.use-case';

import { CrearRolPersonalizadoUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/crear-rol-personalizado.use-case';
import { ListarPermisosUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/listar-permisos.use-case';
import { ListarRolesUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/listar-roles.use-case';
import { AutorizacionProyectoService } from './application/services/autorizacion-proyecto.service';
import { InvitacionEntity } from './infrastructure/persistence/entities/invitacion.entity';
import { PermisoEntity } from './infrastructure/persistence/entities/permiso.entity';
import { PermisoMembresiaEntity } from './infrastructure/persistence/entities/permiso-membresia.entity';
import { RolPermisoEntity } from './infrastructure/persistence/entities/rol-permiso.entity';
import { TypeOrmAutorizacionProyectoRepository } from './infrastructure/persistence/repositories/typeorm-autorizacion-proyecto.repository';
import { TypeOrmRolRepository } from './infrastructure/persistence/repositories/typeorm-rol.repository';
import { ParticipantesRolesController } from './presentation/controllers/participantes-roles.controller';
import { AutorizacionProyectoRepository } from './domain/repositories/autorizacion-proyecto.repository';
import { RolRepository } from './domain/repositories/rol.repository';

import { AsignarPermisoParticularUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/asignar-permiso-particular.use-case';
import { CambiarRolParticipanteUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/cambiar-rol-participante.use-case';
import { InvitarParticipanteUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/invitar-participante.use-case';
import { ListarParticipantesUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/listar-participantes.use-case';
import { ObtenerPermisosParticipanteUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/obtener-permisos-participante.use-case';
import { RetirarParticipanteUseCase } from './application/use-cases/cu03-gestionar-participantes-roles/retirar-participante.use-case';

import { ParticipanteRepository } from './domain/repositories/participante.repository';

import { TypeOrmParticipanteRepository } from './infrastructure/persistence/repositories/typeorm-participante.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsuarioEntity,
      SesionEntity,
      ProyectoEntity,
      RolEntity,
      MembresiaEntity,
      PermisoEntity,
      RolPermisoEntity,
      PermisoMembresiaEntity,
      InvitacionEntity,
    ]),
    JwtModule.register({}),
  ],
  controllers: [
    AuthController,
    ProyectosController,
    ParticipantesRolesController,
  ],
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

    SolicitarRecuperacionUseCase,

    {
      provide: PasswordRecoveryTokenService,
      useClass: JwtPasswordRecoveryTokenService,
    },

    {
      provide: PasswordRecoveryNotifier,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): PasswordRecoveryNotifier => {
        const modo =
          configService
            .get<string>('PASSWORD_RECOVERY_NOTIFIER')
            ?.trim()
            .toLowerCase() ?? 'console';

        if (modo === 'console') {
          return new ConsolePasswordRecoveryNotifier(configService);
        }
        if (modo === 'smtp') {
          return new SmtpPasswordRecoveryNotifier(configService);
        }
        throw new Error(
          'PASSWORD_RECOVERY_NOTIFIER debe ser "console" o "smtp"',
        );
      },
    },

    {
      provide: RecuperacionCuentaRepository,
      useClass: TypeOrmRecuperacionCuentaRepository,
    },
    ConfirmarRecuperacionUseCase,
    ModificarPerfilUseCase,
    ObtenerPerfilUseCase,
    ModificarPerfilUseCase,
    CambiarContrasenaUseCase,
    {
      provide: ProyectoRepository,
      useClass: TypeOrmProyectoRepository,
    },
    CrearProyectoUseCase,
    ListarProyectosUseCase,
    ObtenerProyectoUseCase,
    ModificarProyectoUseCase,
    {
      provide: AutorizacionProyectoRepository,
      useClass: TypeOrmAutorizacionProyectoRepository,
    },
    {
      provide: RolRepository,
      useClass: TypeOrmRolRepository,
    },
    AutorizacionProyectoService,
    ListarRolesUseCase,
    ListarPermisosUseCase,
    CrearRolPersonalizadoUseCase,

    {
      provide: ParticipanteRepository,
      useClass: TypeOrmParticipanteRepository,
    },

    ListarParticipantesUseCase,
    InvitarParticipanteUseCase,
    CambiarRolParticipanteUseCase,
    RetirarParticipanteUseCase,
    ObtenerPermisosParticipanteUseCase,
    AsignarPermisoParticularUseCase,
  ],
  exports: [UsuarioRepository, PasswordHasher, TokenService],
})
export class Pa01Module {}
