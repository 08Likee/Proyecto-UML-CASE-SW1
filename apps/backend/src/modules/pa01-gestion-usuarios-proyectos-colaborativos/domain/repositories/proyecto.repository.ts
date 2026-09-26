import { type Membresia } from '../models/membresia';
import { type Proyecto } from '../models/proyecto';
import { type Rol } from '../models/rol';

export interface CrearProyectoConAnfitrionDatos {
  idUsuario: string;
  nombre: string;
  descripcion: string | null;
  configuracion: Record<string, unknown>;
}

export interface CrearProyectoConAnfitrionResultado {
  proyecto: Proyecto;
  rolAnfitrion: Rol;
  membresia: Membresia;
}

export interface ActualizarProyectoDatos {
  nombre: string;
  descripcion: string | null;
  configuracion: Record<string, unknown>;
}

export abstract class ProyectoRepository {
  abstract crearConAnfitrion(
    datos: CrearProyectoConAnfitrionDatos,
  ): Promise<CrearProyectoConAnfitrionResultado>;

  abstract listarPorUsuario(idUsuario: string): Promise<Proyecto[]>;

  abstract buscarPorId(idProyecto: string): Promise<Proyecto | null>;

  abstract esMiembroActivo(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean>;

  abstract esAnfitrionActivo(
    idProyecto: string,
    idUsuario: string,
  ): Promise<boolean>;

  abstract actualizar(
    idProyecto: string,
    datos: ActualizarProyectoDatos,
  ): Promise<Proyecto | null>;
}
