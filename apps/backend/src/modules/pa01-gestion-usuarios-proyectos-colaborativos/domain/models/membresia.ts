export type MembresiaEstado = 'ACTIVA' | 'INACTIVA' | 'RETIRADA';

export interface Membresia {
  id: string;
  fechaUnion: Date;
  estado: MembresiaEstado;
  fechaUltimaActividad: Date | null;
  idUsuario: string;
  idProyecto: string;
  idRol: string;
}
