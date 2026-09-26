import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import {
  type Permiso,
  type PermisoEstado,
} from '../../../domain/models/permiso';
import { type Rol, type RolEstado } from '../../../domain/models/rol';
import {
  type CrearRolDatos,
  RolRepository,
} from '../../../domain/repositories/rol.repository';
import { PermisoEntity } from '../entities/permiso.entity';
import { RolEntity } from '../entities/rol.entity';
import { RolPermisoEntity } from '../entities/rol-permiso.entity';

@Injectable()
export class TypeOrmRolRepository implements RolRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listarPorProyecto(idProyecto: string): Promise<Rol[]> {
    const roles = await this.dataSource.getRepository(RolEntity).find({
      where: {
        idProyecto,
        estado: 'ACTIVO',
      },
      order: {
        nombre: 'ASC',
      },
    });

    return roles.map((rol) => this.toDomain(rol));
  }

  async listarPermisos(): Promise<Permiso[]> {
    const permisos = await this.dataSource.getRepository(PermisoEntity).find({
      where: {
        estado: 'ACTIVO',
      },
      order: {
        recurso: 'ASC',
        accion: 'ASC',
      },
    });

    return permisos.map((permiso) => ({
      id: permiso.id,
      nombre: permiso.nombre,
      descripcion: permiso.descripcion,
      recurso: permiso.recurso,
      accion: permiso.accion,
      estado: permiso.estado as PermisoEstado,
    }));
  }

  async existenPermisosActivos(ids: string[]): Promise<boolean> {
    if (ids.length === 0) {
      return true;
    }

    const cantidad = await this.dataSource.getRepository(PermisoEntity).count({
      where: {
        id: In(ids),
        estado: 'ACTIVO',
      },
    });

    return cantidad === ids.length;
  }

  async crearPersonalizado(datos: CrearRolDatos): Promise<Rol> {
    return this.dataSource.transaction(async (manager) => {
      const rolRepository = manager.getRepository(RolEntity);

      const rol = await rolRepository.save(
        rolRepository.create({
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          esPredeterminado: false,
          idProyecto: datos.idProyecto,
        }),
      );

      if (datos.permisosIds.length > 0) {
        const rolPermisoRepository = manager.getRepository(RolPermisoEntity);

        await rolPermisoRepository.save(
          datos.permisosIds.map((idPermiso) =>
            rolPermisoRepository.create({
              idRol: rol.id,
              idPermiso,
            }),
          ),
        );
      }

      return this.toDomain(rol);
    });
  }

  private toDomain(rol: RolEntity): Rol {
    return {
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      esPredeterminado: rol.esPredeterminado,
      estado: rol.estado as RolEstado,
      fechaCreacion: rol.fechaCreacion,
      fechaActualizacion: rol.fechaActualizacion,
      idProyecto: rol.idProyecto,
    };
  }
}
