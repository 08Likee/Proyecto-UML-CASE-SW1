import type { ResultadoValidacionExportacionXmi } from '../models/exportacion-xmi';

export class ModeloNoExportableXmiError extends Error {
  constructor(public readonly resultado: ResultadoValidacionExportacionXmi) {
    super(
      'El modelo UML contiene incompatibilidades que impiden exportarlo a XMI',
    );
    this.name = 'ModeloNoExportableXmiError';
  }
}
