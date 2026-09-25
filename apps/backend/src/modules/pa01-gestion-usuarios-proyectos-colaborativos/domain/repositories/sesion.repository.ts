import { type CrearSesionDatos, type Sesion } from '../models/sesion';

export abstract class SesionRepository {
  abstract crear(datos: CrearSesionDatos): Promise<Sesion>;
}
