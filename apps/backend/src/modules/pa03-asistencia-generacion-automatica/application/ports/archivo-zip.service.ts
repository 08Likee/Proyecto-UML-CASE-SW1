import type { ArchivoGenerado } from '../../domain/models/generacion-backend';

export abstract class ArchivoZipService {
  abstract crear(archivos: ArchivoGenerado[]): Promise<Buffer>;
}
