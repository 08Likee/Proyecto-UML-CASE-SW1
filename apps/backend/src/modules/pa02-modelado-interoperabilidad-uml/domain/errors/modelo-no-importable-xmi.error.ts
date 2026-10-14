import type { ResultadoValidacionImportacionXmi } from '../models/importacion-xmi';

export class ModeloNoImportableXmiError extends Error {
  constructor(readonly resultado: ResultadoValidacionImportacionXmi) {
    super('El archivo XMI no puede importarse de forma segura');
    this.name = 'ModeloNoImportableXmiError';
  }
}
