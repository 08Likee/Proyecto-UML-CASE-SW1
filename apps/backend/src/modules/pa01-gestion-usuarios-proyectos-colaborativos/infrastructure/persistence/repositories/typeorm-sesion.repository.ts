import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  type CrearSesionDatos,
  type Sesion,
} from '../../../domain/models/sesion';
import { SesionRepository } from '../../../domain/repositories/sesion.repository';
import { SesionEntity } from '../entities/sesion.entity';

@Injectable()
export class TypeOrmSesionRepository implements SesionRepository {
  constructor(
    @InjectRepository(SesionEntity)
    private readonly repository: Repository<SesionEntity>,
  ) {}

  async crear(datos: CrearSesionDatos): Promise<Sesion> {
    const entity = this.repository.create({
      refreshTokenHash: datos.refreshTokenHash,
      fechaExpiracion: datos.fechaExpiracion,
      dispositivo: datos.dispositivo ?? null,
      idUsuario: datos.idUsuario,
    });

    const guardado = await this.repository.save(entity);

    return this.toDomain(guardado);
  }

  private toDomain(entity: SesionEntity): Sesion {
    return {
      id: entity.id,
      refreshTokenHash: entity.refreshTokenHash,
      fechaCreacion: entity.fechaCreacion,
      fechaExpiracion: entity.fechaExpiracion,
      fechaRevocacion: entity.fechaRevocacion,
      dispositivo: entity.dispositivo,
      idUsuario: entity.idUsuario,
    };
  }
}
