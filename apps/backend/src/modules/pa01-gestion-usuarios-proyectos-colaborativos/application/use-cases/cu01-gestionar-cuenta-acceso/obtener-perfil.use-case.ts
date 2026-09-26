import { Injectable } from '@nestjs/common';
import { UsuarioNoEncontradoError } from '../../../domain/errors/usuario-no-encontrado.error';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';

export interface ObtenerPerfilResultado {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  fotoPerfil: string | null;
}

@Injectable()
export class ObtenerPerfilUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(idUsuario: string): Promise<ObtenerPerfilResultado> {
    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);

    if (!usuario) {
      throw new UsuarioNoEncontradoError();
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      fotoPerfil: usuario.fotoPerfil,
    };
  }
}
