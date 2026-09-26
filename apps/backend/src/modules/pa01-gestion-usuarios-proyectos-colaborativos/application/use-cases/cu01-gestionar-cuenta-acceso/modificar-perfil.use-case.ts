import { Injectable } from '@nestjs/common';
import { UsuarioNoEncontradoError } from '../../../domain/errors/usuario-no-encontrado.error';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';

export interface ModificarPerfilEntrada {
  idUsuario: string;
  nombre: string;
  apellido: string;
  fotoPerfil?: string | null;
}

export interface ModificarPerfilResultado {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  fotoPerfil: string | null;
}

@Injectable()
export class ModificarPerfilUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(
    entrada: ModificarPerfilEntrada,
  ): Promise<ModificarPerfilResultado> {
    const usuario = await this.usuarioRepository.buscarPorId(entrada.idUsuario);

    if (!usuario) {
      throw new UsuarioNoEncontradoError();
    }

    const nombre = entrada.nombre.trim();

    const apellido = entrada.apellido.trim();

    const fotoPerfil =
      entrada.fotoPerfil === undefined
        ? usuario.fotoPerfil
        : entrada.fotoPerfil?.trim() || null;

    const actualizado = await this.usuarioRepository.actualizarPerfil(
      entrada.idUsuario,
      {
        nombre,
        apellido,
        fotoPerfil,
      },
    );

    if (!actualizado) {
      throw new UsuarioNoEncontradoError();
    }

    return {
      id: actualizado.id,
      nombre: actualizado.nombre,
      apellido: actualizado.apellido,
      correo: actualizado.correo,
      fotoPerfil: actualizado.fotoPerfil,
    };
  }
}
