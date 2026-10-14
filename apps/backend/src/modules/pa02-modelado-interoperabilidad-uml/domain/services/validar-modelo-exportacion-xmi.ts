import { ModeloUmlInvalidoError } from '../errors/modelo-uml-invalido.error';
import type { ModeloUml } from '../models/modelo-uml';
import type {
  ProblemaValidacionExportacionXmi,
  ResultadoValidacionExportacionXmi,
} from '../models/exportacion-xmi';
import { validarContenidoModeloUml } from './validar-contenido-modelo-uml';

const TIPOS_UML_COMUNES = new Set([
  'String',
  'Int',
  'Integer',
  'Long',
  'Double',
  'Float',
  'Decimal',
  'Boolean',
  'Date',
  'DateTime',
  'UUID',
]);

function advertencia(
  codigo: string,
  elemento: string | null,
  mensaje: string,
): ProblemaValidacionExportacionXmi {
  return {
    codigo,
    severidad: 'ADVERTENCIA',
    elemento,
    mensaje,
  };
}

function error(
  codigo: string,
  elemento: string | null,
  mensaje: string,
): ProblemaValidacionExportacionXmi {
  return {
    codigo,
    severidad: 'ERROR',
    elemento,
    mensaje,
  };
}

export function validarModeloParaExportacionXmi(
  modelo: ModeloUml,
): ResultadoValidacionExportacionXmi {
  const errores: ProblemaValidacionExportacionXmi[] = [];
  const advertencias: ProblemaValidacionExportacionXmi[] = [];
  const { clases, relaciones } = modelo.contenido;

  try {
    validarContenidoModeloUml(modelo.contenido);
  } catch (unknownError: unknown) {
    if (unknownError instanceof ModeloUmlInvalidoError) {
      errores.push(
        error(
          'XMI_MODELO_UML_INVALIDO',
          unknownError.campo ?? modelo.nombre,
          unknownError.message,
        ),
      );
    } else {
      throw unknownError;
    }
  }

  if (clases.length === 0) {
    errores.push(
      error(
        'XMI_SIN_CLASES',
        modelo.nombre,
        'El modelo debe contener al menos una clase para generar un diagrama de clases XMI.',
      ),
    );
  }

  const nombresClases = new Map<string, number>();
  const tiposPersonalizados = new Map<string, Set<string>>();

  for (const clase of clases) {
    const claveNombre = clase.nombre.trim().toLocaleLowerCase('es');
    nombresClases.set(claveNombre, (nombresClases.get(claveNombre) ?? 0) + 1);

    const registrarTipo = (tipo: string, elemento: string) => {
      const limpio = tipo.trim();
      if (TIPOS_UML_COMUNES.has(limpio)) {
        return;
      }

      const usos = tiposPersonalizados.get(limpio) ?? new Set<string>();
      usos.add(elemento);
      tiposPersonalizados.set(limpio, usos);
    };

    for (const atributo of clase.atributos) {
      registrarTipo(atributo.tipo, `${clase.nombre}.${atributo.nombre}`);
    }

    for (const operacion of clase.operaciones) {
      for (const parametro of operacion.parametros) {
        registrarTipo(
          parametro.tipo,
          `${clase.nombre}.${operacion.nombre}(${parametro.nombre})`,
        );
      }

      if (operacion.tipoRetorno) {
        registrarTipo(
          operacion.tipoRetorno,
          `${clase.nombre}.${operacion.nombre}()`,
        );
      }
    }
  }

  for (const [nombre, cantidad] of nombresClases) {
    if (cantidad > 1) {
      const clasesCoincidentes = clases
        .filter(
          (clase) => clase.nombre.trim().toLocaleLowerCase('es') === nombre,
        )
        .map((clase) => clase.nombre)
        .join(', ');

      advertencias.push(
        advertencia(
          'XMI_NOMBRE_CLASE_DUPLICADO',
          clasesCoincidentes,
          'Enterprise Architect puede mostrar de forma ambigua clases con el mismo nombre dentro del mismo paquete.',
        ),
      );
    }
  }

  for (const [tipo, usos] of tiposPersonalizados) {
    advertencias.push(
      advertencia(
        'XMI_TIPO_PERSONALIZADO',
        [...usos].sort().join(', '),
        `El tipo personalizado "${tipo}" se exportará como uml:DataType para conservar su nombre.`,
      ),
    );
  }

  for (const relacion of relaciones) {
    if (relacion.tipo === 'AGREGACION' || relacion.tipo === 'COMPOSICION') {
      const origen = clases.find(
        (clase) => clase.id === relacion.idClaseOrigen,
      );
      const destino = clases.find(
        (clase) => clase.id === relacion.idClaseDestino,
      );

      advertencias.push(
        advertencia(
          'XMI_EXTREMO_AGREGADO_ORIGEN',
          `${origen?.nombre ?? relacion.idClaseOrigen} → ${destino?.nombre ?? relacion.idClaseDestino}`,
          `Para ${relacion.tipo.toLowerCase()}, la clase de origen se exportará como el extremo ${relacion.tipo === 'COMPOSICION' ? 'compuesto' : 'agregado'} de la relación.`,
        ),
      );
    }
  }

  const atributos = clases.reduce(
    (total, clase) => total + clase.atributos.length,
    0,
  );
  const operaciones = clases.reduce(
    (total, clase) => total + clase.operaciones.length,
    0,
  );

  return {
    valido: errores.length === 0,
    errores,
    advertencias,
    formato: 'Compatible con Enterprise Architect (UML 2.5 / XMI 2.5.1)',
    resumen: {
      clases: clases.length,
      atributos,
      operaciones,
      relaciones: relaciones.length,
    },
  };
}
