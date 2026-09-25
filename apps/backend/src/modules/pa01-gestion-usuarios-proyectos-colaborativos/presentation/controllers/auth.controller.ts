import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { RegistrarCuentaUseCase } from '../../application/use-cases/cu01-gestionar-cuenta-acceso/registrar-cuenta.use-case';
import { RegistrarCuentaDto } from '../dto/registrar-cuenta.dto';

import {
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { IniciarSesionUseCase } from '../../application/use-cases/cu01-gestionar-cuenta-acceso/iniciar-sesion.use-case';
import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { IniciarSesionDto } from '../dto/iniciar-sesion.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registrarCuentaUseCase: RegistrarCuentaUseCase,
    private readonly iniciarSesionUseCase: IniciarSesionUseCase,
  ) {}

  @Post('registro')
  async registrar(@Body() dto: RegistrarCuentaDto) {
    try {
      return await this.registrarCuentaUseCase.execute({
        nombre: dto.nombre,
        apellido: dto.apellido,
        correo: dto.correo,
        contrasena: dto.contrasena,
      });
    } catch (error: unknown) {
      if (error instanceof CorreoYaRegistradoError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async iniciarSesion(
    @Body() dto: IniciarSesionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    try {
      return await this.iniciarSesionUseCase.execute({
        correo: dto.correo,
        contrasena: dto.contrasena,
        dispositivo: userAgent ? userAgent.slice(0, 255) : null,
      });
    } catch (error: unknown) {
      if (error instanceof CredencialesInvalidasError) {
        throw new UnauthorizedException(error.message);
      }

      throw error;
    }
  }
}
