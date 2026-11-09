import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { AutorizacionProyectoService } from './autorizacion-proyecto.service';
import { ProyectoRepository } from '../../domain/repositories/proyecto.repository';

export interface ElementoPapelera {
  id: string;
  nombre: string;
  fechaEliminacion: Date;
  fechaPurga: Date;
  estadoAnterior: string;
}

/** Los estados originales se restauran sin reconstruir ni modificar los contenidos asociados. */
export function restauracionDisponible(estado: string, vencimiento: Date | string | null, ahora: Date): boolean {
  if (estado !== 'ELIMINADO' || !vencimiento) return false;
  return new Date(vencimiento).getTime() > ahora.getTime();
}

@Injectable()
export class PapeleraRecursosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly autorizacion: AutorizacionProyectoService,
    private readonly proyectos: ProyectoRepository,
  ) {}

  private async exigirAnfitrion(
    idProyecto: string, idUsuario: string, recurso: 'PROYECTO' | 'MODELO',
    permitirEliminado = false,
  ): Promise<void> {
    if (!(await this.proyectos.esAnfitrionActivo(idProyecto, idUsuario)) ||
        !(await this.autorizacion.tienePermiso(
          idUsuario, idProyecto, recurso,
          recurso === 'PROYECTO' ? 'MODIFICAR' : 'EDITAR', permitirEliminado,
        ))) {
      throw new ForbiddenException('Solo el Anfitrión con permiso efectivo puede gestionar esta papelera');
    }
  }

  async listarProyectos(idUsuario: string): Promise<ElementoPapelera[]> {
    const candidatos = await this.dataSource.query<ElementoPapelera[]>(`
      SELECT p.id, p.nombre, p.fecha_eliminacion AS "fechaEliminacion",
             p.fecha_purga AS "fechaPurga", p.estado_anterior AS "estadoAnterior"
      FROM proyecto p
      JOIN membresia m ON m.id_proyecto = p.id AND m.id_usuario = $1 AND m.estado = 'ACTIVA'
      JOIN rol r ON r.id = m.id_rol AND r.id_proyecto = p.id AND r.nombre = 'Anfitrión' AND r.estado = 'ACTIVO'
      WHERE p.estado = 'ELIMINADO'
        AND NOT EXISTS (
          SELECT 1 FROM permiso_membresia pm
          JOIN permiso pe ON pe.id = pm.id_permiso
          WHERE pm.id_membresia = m.id AND pm.tipo_asignacion = 'DENEGAR'
            AND pm.estado = 'ACTIVO' AND pe.recurso = 'PROYECTO' AND pe.accion = 'MODIFICAR'
        )
      ORDER BY p.fecha_eliminacion DESC LIMIT 250`, [idUsuario]);
    // No alcanza con tener el rol: una DENEGACIÓN o rol sin permiso debe excluir la fila.
    const permisos = await Promise.all(candidatos.map(c =>
      this.autorizacion.tienePermiso(idUsuario, c.id, 'PROYECTO', 'MODIFICAR', true),
    ));
    return candidatos.filter((_, indice) => permisos[indice]);
  }

  async listarModelos(idUsuario: string, idProyecto: string): Promise<ElementoPapelera[]> {
    await this.exigirAnfitrion(idProyecto, idUsuario, 'MODELO');
    return this.dataSource.query<ElementoPapelera[]>(`
      SELECT u.id, u.nombre, u.fecha_eliminacion AS "fechaEliminacion",
             u.fecha_purga AS "fechaPurga", u.estado_anterior AS "estadoAnterior"
      FROM modelo_uml u JOIN proyecto p ON p.id = u.id_proyecto
      WHERE u.id_proyecto = $1 AND u.estado = 'ELIMINADO' AND p.estado <> 'ELIMINADO'
      ORDER BY u.fecha_eliminacion DESC`, [idProyecto]);
  }

  private async bloquear(
    manager: EntityManager, tabla: 'proyecto' | 'modelo_uml', id: string,
    idProyecto?: string,
  ): Promise<Array<{ id: string; estado: string; estadoAnterior: string | null; fechaPurga: Date | null; nombre: string }>> {
    return manager.query(`
      SELECT id, estado, estado_anterior AS "estadoAnterior", fecha_purga AS "fechaPurga", nombre
      FROM ${tabla} WHERE id = $1 ${idProyecto ? 'AND id_proyecto = $2' : ''} FOR UPDATE`,
      idProyecto ? [id, idProyecto] : [id],
    );
  }

  async moverProyecto(idUsuario: string, idProyecto: string): Promise<void> {
    await this.exigirAnfitrion(idProyecto, idUsuario, 'PROYECTO');
    await this.dataSource.transaction(async (manager) => {
      const [proyecto] = await this.bloquear(manager, 'proyecto', idProyecto);
      if (!proyecto || proyecto.estado === 'ELIMINADO') throw new NotFoundException('Proyecto no disponible');
      // El proyecto es la raíz: sus modelos, chats y membresías se conservan intactos.
      await manager.query(`UPDATE proyecto SET estado_anterior = estado, estado = 'ELIMINADO',
        fecha_eliminacion = CURRENT_TIMESTAMP, fecha_purga = CURRENT_TIMESTAMP + INTERVAL '30 days',
        eliminado_por = $2, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1`, [idProyecto, idUsuario]);
    });
  }

  async restaurarProyecto(idUsuario: string, idProyecto: string): Promise<void> {
    await this.exigirAnfitrion(idProyecto, idUsuario, 'PROYECTO', true);
    await this.dataSource.transaction(async (manager) => {
      const [proyecto] = await this.bloquear(manager, 'proyecto', idProyecto);
      if (!proyecto) throw new NotFoundException('Proyecto no disponible');
      if (!restauracionDisponible(proyecto.estado, proyecto.fechaPurga, new Date())) {
        throw new ConflictException('El proyecto no está disponible para restauración');
      }
      await manager.query(`UPDATE proyecto SET estado = COALESCE(estado_anterior, 'ACTIVO'),
        estado_anterior = NULL, fecha_eliminacion = NULL, fecha_purga = NULL,
        eliminado_por = NULL, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1`, [idProyecto]);
    });
  }

  async moverModelo(idUsuario: string, idProyecto: string, idModelo: string): Promise<void> {
    await this.exigirAnfitrion(idProyecto, idUsuario, 'MODELO');
    await this.dataSource.transaction(async (manager) => {
      const [proyecto] = await this.bloquear(manager, 'proyecto', idProyecto);
      if (!proyecto || proyecto.estado === 'ELIMINADO') throw new NotFoundException('Proyecto no disponible');
      const [modelo] = await this.bloquear(manager, 'modelo_uml', idModelo, idProyecto);
      if (!modelo || modelo.estado !== 'ACTIVO') throw new NotFoundException('Modelo UML no disponible');
      await manager.query(`UPDATE modelo_uml SET estado_anterior = estado, estado = 'ELIMINADO',
        fecha_eliminacion = CURRENT_TIMESTAMP, fecha_purga = CURRENT_TIMESTAMP + INTERVAL '30 days',
        eliminado_por = $2, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $1 AND id_proyecto = $3`, [idModelo, idUsuario, idProyecto]);
    });
  }

  async restaurarModelo(idUsuario: string, idProyecto: string, idModelo: string): Promise<void> {
    await this.exigirAnfitrion(idProyecto, idUsuario, 'MODELO');
    await this.dataSource.transaction(async (manager) => {
      const [proyecto] = await this.bloquear(manager, 'proyecto', idProyecto);
      if (!proyecto || proyecto.estado === 'ELIMINADO') throw new NotFoundException('Proyecto no disponible');
      const [modelo] = await this.bloquear(manager, 'modelo_uml', idModelo, idProyecto);
      if (!modelo) throw new NotFoundException('Modelo UML no disponible');
      if (!restauracionDisponible(modelo.estado, modelo.fechaPurga, new Date())) {
        throw new ConflictException('El modelo no está disponible para restauración');
      }
      await manager.query(`UPDATE modelo_uml SET estado = COALESCE(estado_anterior, 'ACTIVO'),
        estado_anterior = NULL, fecha_eliminacion = NULL, fecha_purga = NULL,
        eliminado_por = NULL, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $1 AND id_proyecto = $2`, [idModelo, idProyecto]);
    });
  }
}
