import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  type CrearUsuarioDatos,
  type Usuario,
  type UsuarioEstado,
} from '../../../domain/models/usuario';
import { UsuarioRepository } from '../../../domain/repositories/usuario.repository';
import { UsuarioEntity } from '../entities/usuario.entity';
import { CorreoYaRegistradoError } from '../../../domain/errors/correo-ya-registrado.error';

@Injectable()
export class TypeOrmUsuarioRepository implements UsuarioRepository {
  constructor(
    @InjectRepository(UsuarioEntity)
    private readonly repository: Repository<UsuarioEntity>,
  ) {}

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const entity = await this.repository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = LOWER(:correo)', { correo })
      .getOne();

    return entity ? this.toDomain(entity) : null;
  }

  private esCorreoDuplicado(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driverError.code === '23505' &&
      driverError.constraint === 'uq_usuario_correo'
    );
  }

  async crear(datos: CrearUsuarioDatos): Promise<Usuario> {
    const entity = this.repository.create({
      nombre: datos.nombre,
      apellido: datos.apellido,
      correo: datos.correo,
      contrasenaHash: datos.contrasenaHash,
      fotoPerfil: datos.fotoPerfil ?? null,
    });

    try {
      const guardado = await this.repository.save(entity);

      return this.toDomain(guardado);
    } catch (error: unknown) {
      if (this.esCorreoDuplicado(error)) {
        throw new CorreoYaRegistradoError();
      }

      throw error;
    }
  }

  private toDomain(entity: UsuarioEntity): Usuario {
    return {
      id: entity.id,
      nombre: entity.nombre,
      apellido: entity.apellido,
      correo: entity.correo,
      contrasenaHash: entity.contrasenaHash,
      fotoPerfil: entity.fotoPerfil,
      estado: entity.estado as UsuarioEstado,
      fechaRegistro: entity.fechaRegistro,
      ultimaConexion: entity.ultimaConexion,
    };
  }
}
