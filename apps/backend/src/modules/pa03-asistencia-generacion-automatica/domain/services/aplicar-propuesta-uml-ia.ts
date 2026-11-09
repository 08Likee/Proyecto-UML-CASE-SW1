import { randomUUID } from 'node:crypto';
import type { ModeloUmlContenido, ClaseUml, RelacionUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import type { CambiosPropuestosUml } from '../models/propuesta-uml-ia';

/** Convierte el borrador aprobado a elementos reales sin mutar el modelo de entrada. */
export function aplicarPropuestaAlContenido(
  actual: ModeloUmlContenido,
  cambios: CambiosPropuestosUml,
  generarId: () => string = randomUUID,
): ModeloUmlContenido {
  const clases: ClaseUml[] = actual.clases.map((c) => ({ ...c, atributos: [...c.atributos] }));
  const normalizar = (nombre: string) => nombre.normalize('NFC').toLocaleLowerCase('es');
  const porNombre = new Map(clases.map((c) => [normalizar(c.nombre), c]));
  const toAtributo = (a: CambiosPropuestosUml['clasesNuevas'][number]['atributos'][number]) => ({
    id: generarId(), nombre: a.nombre, tipo: a.tipo, visibilidad: a.visibilidad,
  });

  const posiciones = clases.map((c) => c.posicion);
  const maxX = posiciones.length ? Math.max(...posiciones.map((p) => p.x)) : 0;
  const minY = posiciones.length ? Math.min(...posiciones.map((p) => p.y)) : 100;
  const baseX = Math.min(1_000_000, maxX + 350);
  const baseY = Math.max(-1_000_000, Math.min(1_000_000, minY));

  for (const [indice, propuesta] of cambios.clasesNuevas.entries()) {
    const clase: ClaseUml = {
      id: generarId(), nombre: propuesta.nombre,
      atributos: propuesta.atributos.map(toAtributo), operaciones: [],
      posicion: { x: baseX + (indice % 2) * 350, y: baseY + Math.floor(indice / 2) * 250 },
      persistencia: { persistente: false, idAtributoIdentificador: null },
    };
    clases.push(clase);
    porNombre.set(normalizar(clase.nombre), clase);
  }

  for (const propuesta of cambios.atributosEnClasesExistentes) {
    const clase = porNombre.get(normalizar(propuesta.clase));
    if (!clase) throw new Error('La clase de destino ya no existe.');
    clase.atributos.push(...propuesta.atributos.map(toAtributo));
  }

  const relaciones: RelacionUml[] = [...actual.relaciones];
  for (const r of cambios.relacionesNuevas) {
    const origen = porNombre.get(normalizar(r.claseOrigen));
    const destino = porNombre.get(normalizar(r.claseDestino));
    if (!origen || !destino) throw new Error('Las clases de la relación ya no existen.');
    relaciones.push({
      id: generarId(), tipo: r.tipo, idClaseOrigen: origen.id, idClaseDestino: destino.id,
      nombre: r.nombre, multiplicidadOrigen: r.multiplicidadOrigen,
      multiplicidadDestino: r.multiplicidadDestino,
    });
  }
  return { ...actual, clases, relaciones };
}
