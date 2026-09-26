import { type Permiso } from '../models/permiso';
import { type Rol } from '../models/rol';

export interface CrearRolDatos {
  idProyecto: string;
  nombre: string;
  descripcion: string | null;
  permisosIds: string[];
}

export abstract class RolRepository {
  abstract listarPorProyecto(idProyecto: string): Promise<Rol[]>;

  abstract listarPermisos(): Promise<Permiso[]>;

  abstract crearPersonalizado(datos: CrearRolDatos): Promise<Rol>;

  abstract existenPermisosActivos(ids: string[]): Promise<boolean>;
}
