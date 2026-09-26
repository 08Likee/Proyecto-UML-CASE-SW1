import { type CrearSesionDatos, type Sesion } from '../models/sesion';

export abstract class SesionRepository {
  abstract crear(datos: CrearSesionDatos): Promise<Sesion>;

  abstract buscarPorRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<Sesion | null>;

  abstract revocar(idSesion: string, fecha: Date): Promise<void>;

  abstract buscarPorId(idSesion: string): Promise<Sesion | null>;
}
