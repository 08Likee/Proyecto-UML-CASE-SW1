import type {
  ClaseUml,
  ModeloUml,
  MultiplicidadUml,
} from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import type {
  EspecificacionBackend,
  RelacionBackend,
  TipoRelacionJpa,
} from '../models/generacion-backend';
import { esMuchos } from './validar-modelo-generacion';

const MAPEO_TIPOS: Record<string, string> = {
  String: 'String',
  Int: 'Integer',
  Integer: 'Integer',
  Long: 'Long',
  Double: 'Double',
  Float: 'Float',
  Decimal: 'BigDecimal',
  Boolean: 'Boolean',
  Date: 'LocalDate',
  DateTime: 'LocalDateTime',
  UUID: 'UUID',
};

export function transformarModeloABackend(
  modelo: ModeloUml,
  operacionesPendientes: EspecificacionBackend['operacionesPendientes'],
): EspecificacionBackend {
  const persistentes = modelo.contenido.clases.filter(
    (clase) => clase.persistencia.persistente,
  );
  const porId = new Map(persistentes.map((clase) => [clase.id, clase]));

  const relacionesPorOrigen = new Map<string, RelacionBackend[]>();
  for (const relacion of modelo.contenido.relaciones) {
    if (relacion.tipo === 'GENERALIZACION') {
      continue;
    }
    const origen = porId.get(relacion.idClaseOrigen);
    const destino = porId.get(relacion.idClaseDestino);
    if (
      !origen ||
      !destino ||
      !relacion.multiplicidadOrigen ||
      !relacion.multiplicidadDestino
    ) {
      continue;
    }

    const lista = relacionesPorOrigen.get(origen.id) ?? [];
    lista.push({
      nombreCampo: nombreRelacion(destino, relacion.nombre),
      entidadDestino: destino.nombre,
      tipo: mapearRelacion(
        relacion.multiplicidadOrigen,
        relacion.multiplicidadDestino,
      ),
    });
    relacionesPorOrigen.set(origen.id, lista);
  }

  const artifactId = normalizarArtifactId(modelo.nombre);
  return {
    nombreProyecto: modelo.nombre,
    artifactId,
    paqueteBase: `com.generated.${normalizarPaquete(artifactId)}`,
    entidades: persistentes.map((clase) => {
      const id = clase.atributos.find(
        (atributo) =>
          atributo.id === clase.persistencia.idAtributoIdentificador,
      )!;
      return {
        nombre: clase.nombre,
        idNombre: id.nombre,
        idTipoJava: MAPEO_TIPOS[id.tipo],
        atributos: clase.atributos.map((atributo) => ({
          nombre: atributo.nombre,
          tipoJava: MAPEO_TIPOS[atributo.tipo],
          identificador: atributo.id === id.id,
        })),
        relaciones: relacionesPorOrigen.get(clase.id) ?? [],
      };
    }),
    operacionesPendientes,
  };
}

function mapearRelacion(
  multiplicidadOrigen: MultiplicidadUml,
  multiplicidadDestino: MultiplicidadUml,
): TipoRelacionJpa {
  const origenMuchos = esMuchos(multiplicidadOrigen);
  const destinoMuchos = esMuchos(multiplicidadDestino);

  if (!origenMuchos && !destinoMuchos) return 'ONE_TO_ONE';
  if (!origenMuchos && destinoMuchos) return 'ONE_TO_MANY';
  if (origenMuchos && !destinoMuchos) return 'MANY_TO_ONE';
  return 'MANY_TO_MANY';
}

function nombreRelacion(destino: ClaseUml, nombre: string | null): string {
  if (nombre && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(nombre)) {
    return nombre;
  }
  return destino.nombre.charAt(0).toLowerCase() + destino.nombre.slice(1);
}

function normalizarArtifactId(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return limpio || 'backend-generado';
}

function normalizarPaquete(artifactId: string): string {
  const partes = artifactId.split('-').filter(Boolean);
  const unido = partes.join('');
  return /^[a-z]/.test(unido) ? unido : `app${unido}`;
}
