import { BadRequestException, Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';
import { RolRepository } from '../../../domain/repositories/rol.repository';

export interface CrearRolPersonalizadoEntrada {
  idUsuario: string;
  idProyecto: string;
  nombre: string;
  descripcion?: string | null;
  permisosIds: string[];
}

@Injectable()
export class CrearRolPersonalizadoUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,
    private readonly rolRepository: RolRepository,
  ) {}

  async execute(entrada: CrearRolPersonalizadoEntrada) {
    await this.autorizacion.exigirPermiso(
      entrada.idUsuario,
      entrada.idProyecto,
      PERMISOS.ROL.CREAR.recurso,
      PERMISOS.ROL.CREAR.accion,
    );

    const permisosValidos = await this.rolRepository.existenPermisosActivos(
      entrada.permisosIds,
    );

    if (!permisosValidos) {
      throw new BadRequestException(
        'La configuración de permisos del rol no es válida',
      );
    }

    return this.rolRepository.crearPersonalizado({
      idProyecto: entrada.idProyecto,
      nombre: entrada.nombre.trim(),
      descripcion: entrada.descripcion?.trim() || null,
      permisosIds: entrada.permisosIds,
    });
  }
}
