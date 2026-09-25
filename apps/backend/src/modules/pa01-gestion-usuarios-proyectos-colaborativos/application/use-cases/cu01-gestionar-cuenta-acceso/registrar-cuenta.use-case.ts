import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../ports/security/password-hasher';
import { CorreoYaRegistradoError } from '../../../domain/errors/correo-ya-registrado.error';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';

export interface RegistrarCuentaEntrada {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
}

export interface RegistrarCuentaResultado {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  fotoPerfil: string | null;
  estado: string;
  fechaRegistro: Date;
}

@Injectable()
export class RegistrarCuentaUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    entrada: RegistrarCuentaEntrada,
  ): Promise<RegistrarCuentaResultado> {
    const correoNormalizado = entrada.correo.trim().toLowerCase();

    const usuarioExistente =
      await this.usuarioRepository.buscarPorCorreo(correoNormalizado);

    if (usuarioExistente) {
      throw new CorreoYaRegistradoError();
    }

    const contrasenaHash = await this.passwordHasher.hash(entrada.contrasena);

    const usuario = await this.usuarioRepository.crear({
      nombre: entrada.nombre.trim(),
      apellido: entrada.apellido.trim(),
      correo: correoNormalizado,
      contrasenaHash,
    });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      fotoPerfil: usuario.fotoPerfil,
      estado: usuario.estado,
      fechaRegistro: usuario.fechaRegistro,
    };
  }
}
