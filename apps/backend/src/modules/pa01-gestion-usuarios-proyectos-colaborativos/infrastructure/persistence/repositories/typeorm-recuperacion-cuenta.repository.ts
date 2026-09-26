import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  RecuperacionCuentaRepository,
  type ActualizarContrasenaRecuperacionDatos,
} from '../../../application/ports/persistence/recuperacion-cuenta.repository';

import { UsuarioEntity } from '../entities/usuario.entity';

@Injectable()
export class TypeOrmRecuperacionCuentaRepository extends RecuperacionCuentaRepository {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async buscarContrasenaHashPorUsuarioId(
    idUsuario: string,
  ): Promise<string | null> {
    const resultado = await this.dataSource.query<
      Array<{
        contrasena_hash: string;
      }>
    >(
      `
        SELECT contrasena_hash
        FROM usuario
        WHERE id = $1
        LIMIT 1
      `,
      [idUsuario],
    );

    if (resultado.length === 0) {
      return null;
    }

    return resultado[0].contrasena_hash;
  }

  async actualizarContrasenaYRevocarSesiones(
    datos: ActualizarContrasenaRecuperacionDatos,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const resultado = await manager
        .createQueryBuilder()
        .update(UsuarioEntity)
        .set({
          contrasenaHash: datos.nuevaContrasenaHash,
        })
        .where('id = :idUsuario', {
          idUsuario: datos.idUsuario,
        })
        .andWhere('contrasena_hash = :contrasenaHashActual', {
          contrasenaHashActual: datos.contrasenaHashActual,
        })
        .execute();

      if (resultado.affected !== 1) {
        return false;
      }

      await manager.query(
        `
          UPDATE sesion
          SET fecha_revocacion = $1
          WHERE id_usuario = $2
            AND fecha_revocacion IS NULL
        `,
        [datos.fechaRevocacion, datos.idUsuario],
      );

      return true;
    });
  }
}
