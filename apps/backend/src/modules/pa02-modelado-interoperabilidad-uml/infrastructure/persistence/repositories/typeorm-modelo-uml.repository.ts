import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  type ModeloUml,
  type ModeloUmlEstado,
  type ModeloUmlResumen,
} from '../../../domain/models/modelo-uml';
import {
  type ActualizarModeloUmlDatos,
  type ActualizarModeloUmlResultado,
  type CrearModeloUmlDatos,
  ModeloUmlRepository,
} from '../../../domain/repositories/modelo-uml.repository';
import { ModeloUmlEntity } from '../entities/modelo-uml.entity';

@Injectable()
export class TypeOrmModeloUmlRepository implements ModeloUmlRepository {
  constructor(private readonly dataSource: DataSource) {}

  async crear(datos: CrearModeloUmlDatos): Promise<ModeloUml> {
    const repository = this.dataSource.getRepository(ModeloUmlEntity);

    const creado = await repository.save(
      repository.create({
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        contenido: datos.contenido,
        idProyecto: datos.idProyecto,
      }),
    );

    return this.toDomain(creado);
  }

  async listarActivosPorProyecto(
    idProyecto: string,
  ): Promise<ModeloUmlResumen[]> {
    const modelos = await this.dataSource.getRepository(ModeloUmlEntity).find({
      where: {
        idProyecto,
        estado: 'ACTIVO',
      },
      order: {
        fechaActualizacion: 'DESC',
      },
    });

    return modelos.map((modelo) => this.toResumen(modelo));
  }

  async buscarActivoPorIdYProyecto(
    idModelo: string,
    idProyecto: string,
  ): Promise<ModeloUml | null> {
    const modelo = await this.dataSource
      .getRepository(ModeloUmlEntity)
      .findOne({
        where: {
          id: idModelo,
          idProyecto,
          estado: 'ACTIVO',
        },
      });

    return modelo ? this.toDomain(modelo) : null;
  }

  async actualizarSiVersionCoincide(
    idModelo: string,
    idProyecto: string,
    datos: ActualizarModeloUmlDatos,
  ): Promise<ActualizarModeloUmlResultado> {
    const repository = this.dataSource.getRepository(ModeloUmlEntity);

    const resultado = await repository
      .createQueryBuilder()
      .update(ModeloUmlEntity)
      .set({
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        contenido: () => 'CAST(:contenido AS jsonb)',
        version: () => 'version + 1',
        fechaActualizacion: new Date(),
      })
      .where('id = :idModelo', { idModelo })
      .andWhere('id_proyecto = :idProyecto', { idProyecto })
      .andWhere("estado = 'ACTIVO'")
      .andWhere('version = :versionEsperada', {
        versionEsperada: datos.versionEsperada,
      })
      .setParameter('contenido', JSON.stringify(datos.contenido))
      .execute();

    if (resultado.affected === 1) {
      const actualizado = await repository.findOne({
        where: {
          id: idModelo,
          idProyecto,
          estado: 'ACTIVO',
        },
      });

      if (!actualizado) {
        return {
          tipo: 'NO_ENCONTRADO',
        };
      }

      return {
        tipo: 'ACTUALIZADO',
        modelo: this.toDomain(actualizado),
      };
    }

    const existente = await repository.findOne({
      where: {
        id: idModelo,
        idProyecto,
        estado: 'ACTIVO',
      },
      select: {
        id: true,
        version: true,
      },
    });

    if (!existente) {
      return {
        tipo: 'NO_ENCONTRADO',
      };
    }

    return {
      tipo: 'VERSION_CONFLICTIVA',
    };
  }

  private toDomain(entity: ModeloUmlEntity): ModeloUml {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      contenido: entity.contenido,
      version: entity.version,
      estado: entity.estado as ModeloUmlEstado,
      fechaCreacion: entity.fechaCreacion,
      fechaActualizacion: entity.fechaActualizacion,
      idProyecto: entity.idProyecto,
    };
  }

  private toResumen(entity: ModeloUmlEntity): ModeloUmlResumen {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      version: entity.version,
      estado: entity.estado as ModeloUmlEstado,
      fechaCreacion: entity.fechaCreacion,
      fechaActualizacion: entity.fechaActualizacion,
      idProyecto: entity.idProyecto,
    };
  }
}
