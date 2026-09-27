import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  type Membresia,
  type MembresiaEstado,
} from '../../../domain/models/membresia';
import {
  type Proyecto,
  type ProyectoEstado,
} from '../../../domain/models/proyecto';
import {
  ROL_ANFITRION,
  ROL_EDITOR,
  ROL_ESPECTADOR,
  rolPredeterminadoIncluyePermiso,
  type Rol,
  type RolEstado,
} from '../../../domain/models/rol';
import {
  type CrearProyectoConAnfitrionDatos,
  type CrearProyectoConAnfitrionResultado,
  ProyectoRepository,
} from '../../../domain/repositories/proyecto.repository';
import { MembresiaEntity } from '../entities/membresia.entity';
import { PermisoEntity } from '../entities/permiso.entity';
import { ProyectoEntity } from '../entities/proyecto.entity';
import { RolEntity } from '../entities/rol.entity';
import { RolPermisoEntity } from '../entities/rol-permiso.entity';

@Injectable()
export class TypeOrmProyectoRepository implements ProyectoRepository {
  constructor(private readonly dataSource: DataSource) {}

  async crearConAnfitrion(
    datos: CrearProyectoConAnfitrionDatos,
  ): Promise<CrearProyectoConAnfitrionResultado> {
    return this.dataSource.transaction(async (manager) => {
      const proyectoRepository = manager.getRepository(ProyectoEntity);

      const rolRepository = manager.getRepository(RolEntity);

      const membresiaRepository = manager.getRepository(MembresiaEntity);

      const proyecto = await proyectoRepository.save(
        proyectoRepository.create({
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          configuracion: datos.configuracion,
        }),
      );

      const rolesPredeterminados = await rolRepository.save([
        rolRepository.create({
          nombre: ROL_ANFITRION,
          descripcion: 'Rol predeterminado del creador del proyecto',
          esPredeterminado: true,
          idProyecto: proyecto.id,
        }),
        rolRepository.create({
          nombre: ROL_EDITOR,
          descripcion:
            'Rol predeterminado para editar modelos sin administrar el proyecto',
          esPredeterminado: true,
          idProyecto: proyecto.id,
        }),
        rolRepository.create({
          nombre: ROL_ESPECTADOR,
          descripcion:
            'Rol predeterminado de consulta sin permisos de edición',
          esPredeterminado: true,
          idProyecto: proyecto.id,
        }),
      ]);

      const rolAnfitrion = rolesPredeterminados.find(
        (rol) => rol.nombre === ROL_ANFITRION,
      );

      if (!rolAnfitrion) {
        throw new Error('No se pudo crear el rol Anfitrión del proyecto');
      }

      const permisos = await manager.getRepository(PermisoEntity).find({
        where: {
          estado: 'ACTIVO',
        },
      });

      const asociaciones = rolesPredeterminados.flatMap((rol) =>
        permisos
          .filter((permiso) =>
            rolPredeterminadoIncluyePermiso(
              rol.nombre,
              permiso.recurso,
              permiso.accion,
            ),
          )
          .map((permiso) => ({
            idRol: rol.id,
            idPermiso: permiso.id,
          })),
      );

      if (asociaciones.length > 0) {
        await manager.getRepository(RolPermisoEntity).save(asociaciones);
      }

      const membresia = await membresiaRepository.save(
        membresiaRepository.create({
          idUsuario: datos.idUsuario,
          idProyecto: proyecto.id,
          idRol: rolAnfitrion.id,
        }),
      );

      return {
        proyecto: this.proyectoToDomain(proyecto),
        rolAnfitrion: this.rolToDomain(rolAnfitrion),
        membresia: this.membresiaToDomain(membresia),
      };
    });
  }

  async listarPorUsuario(idUsuario: string): Promise<Proyecto[]> {
    const proyectos = await this.dataSource
      .getRepository(ProyectoEntity)
      .createQueryBuilder('proyecto')
      .innerJoin(
        MembresiaEntity,
        'membresia',
        `
          membresia.id_proyecto =
          proyecto.id
        `,
      )
      .where('membresia.id_usuario = :idUsuario', {
        idUsuario,
      })
      .andWhere('membresia.estado = :estado', {
        estado: 'ACTIVA',
      })
      .orderBy('proyecto.fecha_actualizacion', 'DESC')
      .getMany();

    return proyectos.map((proyecto) => this.proyectoToDomain(proyecto));
  }

  async buscarPorId(idProyecto: string): Promise<Proyecto | null> {
    const proyecto = await this.dataSource
      .getRepository(ProyectoEntity)
      .findOne({
        where: {
          id: idProyecto,
        },
      });

    return proyecto ? this.proyectoToDomain(proyecto) : null;
  }

  async esMiembroActivo(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean> {
    const cantidad = await this.dataSource
      .getRepository(MembresiaEntity)
      .count({
        where: {
          idProyecto,
          idUsuario,
          estado: 'ACTIVA',
        },
      });

    return cantidad > 0;
  }

  async esAnfitrionActivo(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean> {
    const cantidad = await this.dataSource
      .getRepository(MembresiaEntity)
      .createQueryBuilder('membresia')
      .innerJoin(
        RolEntity,
        'rol',
        `
          rol.id = membresia.id_rol
          AND rol.id_proyecto =
              membresia.id_proyecto
        `,
      )
      .where('membresia.id_proyecto = :idProyecto', {
        idProyecto,
      })
      .andWhere('membresia.id_usuario = :idUsuario', {
        idUsuario,
      })
      .andWhere('membresia.estado = :estadoMembresia', {
        estadoMembresia: 'ACTIVA',
      })
      .andWhere('rol.estado = :estadoRol', {
        estadoRol: 'ACTIVO',
      })
      .andWhere('rol.nombre = :nombreRol', {
        nombreRol: ROL_ANFITRION,
      })
      .getCount();

    return cantidad > 0;
  }

  async actualizar(
    idProyecto: string,
    datos: {
      nombre: string;
      descripcion: string | null;
      configuracion: Record<string, unknown>;
    },
  ): Promise<Proyecto | null> {
    const repository = this.dataSource.getRepository(ProyectoEntity);

    const proyecto = await repository.findOne({
      where: {
        id: idProyecto,
      },
    });

    if (!proyecto) {
      return null;
    }

    proyecto.nombre = datos.nombre;
    proyecto.descripcion = datos.descripcion;
    proyecto.configuracion = datos.configuracion;
    proyecto.fechaActualizacion = new Date();

    const actualizado = await repository.save(proyecto);

    return this.proyectoToDomain(actualizado);
  }

  private proyectoToDomain(entity: ProyectoEntity): Proyecto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      fechaCreacion: entity.fechaCreacion,
      estado: entity.estado as ProyectoEstado,
      configuracion: entity.configuracion,
      fechaActualizacion: entity.fechaActualizacion,
    };
  }

  private rolToDomain(entity: RolEntity): Rol {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      esPredeterminado: entity.esPredeterminado,
      estado: entity.estado as RolEstado,
      fechaCreacion: entity.fechaCreacion,
      fechaActualizacion: entity.fechaActualizacion,
      idProyecto: entity.idProyecto,
    };
  }

  private membresiaToDomain(entity: MembresiaEntity): Membresia {
    return {
      id: entity.id,
      fechaUnion: entity.fechaUnion,
      estado: entity.estado as MembresiaEstado,
      fechaUltimaActividad: entity.fechaUltimaActividad,
      idUsuario: entity.idUsuario,
      idProyecto: entity.idProyecto,
      idRol: entity.idRol,
    };
  }
}
