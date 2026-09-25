import { Body, ConflictException, Controller, Post } from '@nestjs/common';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { RegistrarCuentaUseCase } from '../../application/use-cases/cu01-gestionar-cuenta-acceso/registrar-cuenta.use-case';
import { RegistrarCuentaDto } from '../dto/registrar-cuenta.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registrarCuentaUseCase: RegistrarCuentaUseCase,
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
}
