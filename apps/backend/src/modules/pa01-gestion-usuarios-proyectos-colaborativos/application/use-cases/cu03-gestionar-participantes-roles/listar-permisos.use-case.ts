import { Injectable } from '@nestjs/common';
import { AutorizacionProyectoService } from '../../services/autorizacion-proyecto.service';
import { PERMISOS } from '../../../domain/models/permiso';
import { RolRepository } from '../../../domain/repositories/rol.repository';

@Injectable()
export class ListarPermisosUseCase {
  constructor(
    private readonly autorizacion: AutorizacionProyectoService,
    private readonly rolRepository: RolRepository,
  ) {}

  async execute(idUsuario: string, idProyecto: string) {
    await this.autorizacion.exigirPermiso(
      idUsuario,
      idProyecto,
      PERMISOS.ROL.CONSULTAR.recurso,
      PERMISOS.ROL.CONSULTAR.accion,
    );

    return this.rolRepository.listarPermisos();
  }
}
