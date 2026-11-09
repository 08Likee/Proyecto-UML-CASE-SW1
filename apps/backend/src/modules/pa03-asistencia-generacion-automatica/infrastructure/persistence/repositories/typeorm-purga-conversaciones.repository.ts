import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PurgaConversacionesRepository } from '../../../application/ports/purga-conversaciones.repository';

/**
 * CU-12 Bloque 12.2.2: purga irreversible de chats vencidos.
 * El reloj y la elegibilidad se evalúan en PostgreSQL, nunca en el navegador.
 */
@Injectable()
export class TypeOrmPurgaConversacionesRepository extends PurgaConversacionesRepository {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async purgarLote(limite: number): Promise<number> {
    if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
      throw new Error('Tamaño de lote de purga inválido');
    }

    return this.dataSource.transaction(async (manager): Promise<number> => {
      // FOR UPDATE impide que una restauración cambie el estado durante la purga.
      // SKIP LOCKED permite varios procesos sin purgar simultáneamente el mismo chat.
      const conversaciones = await manager.query<Array<{ id: string }>>(`
        SELECT c.id FROM conversacion_ia c
        WHERE c.estado = 'ELIMINADA' AND c.fecha_purga <= CURRENT_TIMESTAMP
        ORDER BY c.fecha_purga ASC, c.id ASC
        LIMIT $1 FOR UPDATE SKIP LOCKED
      `, [limite]);
      if (conversaciones.length === 0) return 0;

      const ids = conversaciones.map((conversacion) => conversacion.id);
      // Ambas claves foráneas de CU-13 son RESTRICT: las propuestas van primero.
      // Todo el lote queda dentro de la misma transacción para garantizar rollback.
      await manager.query(`
        DELETE FROM propuesta_uml_ia WHERE id_conversacion = ANY($1::uuid[])
      `, [ids]);
      await manager.query(`
        DELETE FROM mensaje_ia WHERE id_conversacion = ANY($1::uuid[])
      `, [ids]);
      const resultado = await manager.query<[Array<{ id: string }>, number]>(`
        DELETE FROM conversacion_ia
        WHERE id = ANY($1::uuid[]) AND estado = 'ELIMINADA'
          AND fecha_purga <= CURRENT_TIMESTAMP
        RETURNING id
      `, [ids]);
      const eliminadas = resultado[0]?.length ?? 0;
      if (eliminadas !== ids.length) {
        throw new Error('La purga no confirmó todas las conversaciones bloqueadas');
      }
      return eliminadas;
    });
  }
}
