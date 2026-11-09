import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ModeloUmlContenido } from '../../src/features/pa02-modelado-interoperabilidad-uml/cu05-modelar-diagrama-clases/types/modelo-uml.types.ts';
import { interpretarOrdenExplicita } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/interpretar-orden-explicita.ts';
import { ejecutarIntencionSobreModelo } from '../../src/features/pa03-asistencia-generacion-automatica/cu09-interactuar-asistente-ia/services/ejecutar-intencion-modelo.ts';

function modeloConCliente(): ModeloUmlContenido {
  return {
    versionEsquema: 1,
    configuracion: {},
    relaciones: [],
    clases: [{
      id: 'c1', nombre: 'Cliente', atributos: [{ id: 'a1', nombre: 'id', tipo: 'Integer', visibilidad: 'PRIVADA' }],
      operaciones: [], posicion: { x: 10, y: 20 },
      persistencia: { persistente: false, idAtributoIdentificador: null },
    }],
  };
}

test('interpreta agregar nombre String sin inicializar WebLLM', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Agrega a la clase Cliente un atributo llamado nombre de tipo String.', modelo, false);
  assert.deepEqual(intencion, {
    version: 1, estado: 'LISTA',
    acciones: [{ tipo: 'AGREGAR_ATRIBUTO', clase: { id: 'c1', nombre: undefined }, atributo: { nombre: 'nombre', tipo: 'String' } }],
  });
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    assert.deepEqual(resultado.contenido.clases[0].atributos.map(a => [a.nombre, a.tipo, a.visibilidad]), [
      ['id', 'Integer', 'PRIVADA'], ['nombre', 'String', 'PRIVADA'],
    ]);
  }
  assert.equal(modelo.clases[0].atributos.length, 1, 'el original debe permanecer inalterado');
});

test('interpreta formulaciones equivalentes para agregar un atributo sin WebLLM', () => {
  const frases = [
    'Agrega a Cliente el atributo edad de tipo Integer.',
    'A la clase Cliente, agrega el atributo edad de tipo Integer.',
    'En la clase Cliente añade el campo edad de tipo Integer.',
    'En Cliente añade el campo edad Integer.',
    'A la clase Cliente agrégale edad de tipo Integer.',
    'Incorpora edad como Integer dentro de Cliente.',
  ];
  for (const frase of frases) {
    const modelo = modeloConCliente();
    const intencion = interpretarOrdenExplicita(frase, modelo, false);
    assert.ok(intencion, frase);
    const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
    assert.equal(resultado.exito, true, frase);
    if (resultado.exito) {
      assert.deepEqual(resultado.contenido.clases[0].atributos.map(a => [a.nombre, a.tipo]), [
        ['id', 'Integer'], ['edad', 'Integer'],
      ], frase);
      assert.equal(resultado.contenido.clases[0].atributos[1].visibilidad, 'PRIVADA');
    }
    assert.equal(modelo.clases[0].atributos.length, 1, 'sin mutación de entrada');
  }
});

test('las nuevas variantes no permiten ambigüedades, datos faltantes ni acciones extra', () => {
  const modelo = modeloConCliente();
  for (const frase of [
    'A la clase Cliente, agrega el atributo edad.',
    'En Cliente añade el campo edad.',
    'A la clase Cliente agrégale edad de tipo Integer y elimina Cliente.',
    'Incorpora edad como Integer dentro de Cliente y borra la clase.',
    'En Cliente añade el campo edad Integer y borra Cliente.',
    'A la clase Inexistente, agrega el atributo edad de tipo Integer.',
    '¿En Cliente añade el campo edad Integer?',
  ]) {
    assert.equal(interpretarOrdenExplicita(frase, modelo, false), null, frase);
  }
  const valida = 'A la clase Cliente, agrega el atributo edad de tipo Integer.';
  assert.equal(interpretarOrdenExplicita(valida, modelo, true), null, 'contexto pendiente');
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2' });
  assert.equal(interpretarOrdenExplicita(valida, modelo, false), null, 'clase ambigua');
});

test('agrega atributo con clase primero, algun y tipo en minúsculas', () => {
  const frases = [
    'la clase Prueba09, agrega algun atributo llamado id de tipo string',
    'La clase Prueba09, agrega algún atributo llamado id de tipo STRING.',
    'Agrega a la clase Prueba09 algún atributo llamado id de tipo String.',
  ];
  for (const frase of frases) {
    const modelo = modeloConCliente();
    modelo.clases[0].nombre = 'Prueba09';
    modelo.clases[0].atributos = [];
    const intencion = interpretarOrdenExplicita(frase, modelo, false);
    assert.ok(intencion, frase);
    const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
    assert.equal(resultado.exito, true, frase);
    if (!resultado.exito) continue;
    assert.deepEqual(
      resultado.contenido.clases[0].atributos.map(a => [a.nombre, a.tipo, a.visibilidad]),
      [['id', 'String', 'PRIVADA']],
      frase,
    );
    assert.deepEqual(modelo.clases[0].atributos, [], 'no debe mutar el modelo original');
  }
});

test('variantes con algun no aceptan instrucciones incompletas, compuestas o ambiguas', () => {
  const modelo = modeloConCliente();
  modelo.clases[0].nombre = 'Prueba09';
  modelo.clases[0].atributos = [];
  const valida = 'La clase Prueba09, agrega algún atributo llamado id de tipo string.';
  for (const frase of [
    'La clase Prueba09, agrega algún atributo llamado id.',
    'La clase Prueba09, agrega algún atributo de tipo String.',
    'La clase Prueba09, agrega algún atributo llamado id de tipo String y elimina la clase.',
    'La clase Inexistente, agrega algún atributo llamado id de tipo String.',
  ]) {
    assert.equal(interpretarOrdenExplicita(frase, modelo, false), null, frase);
  }
  assert.equal(interpretarOrdenExplicita(valida, modelo, true), null, 'contexto pendiente');
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2' });
  assert.equal(interpretarOrdenExplicita(valida, modelo, false), null, 'clase ambigua');
});

test('permite crear una clase nueva sencilla', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Crea una clase llamada Factura.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) assert.equal(resultado.contenido.clases[1].nombre, 'Factura');
});

test('nunca ejecuta órdenes compuestas o atributos sin tipo', () => {
  const modelo = modeloConCliente();
  assert.equal(interpretarOrdenExplicita('Agrega a la clase Cliente un atributo llamado nombre.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Agrega a la clase Cliente un atributo llamado nombre de tipo String y bórrala.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una clase Factura con id Integer.', modelo, false), null);
});

test('desactiva la ruta directa si hay información pendiente', () => {
  assert.equal(interpretarOrdenExplicita('Crea la clase Factura.', modeloConCliente(), true), null);
  assert.equal(interpretarOrdenExplicita('Agrega a la clase Cliente un atributo llamado nombre de tipo String.', modeloConCliente(), true), null);
});

test('no se salta restricciones por duplicados', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Agrega a la clase Cliente un atributo llamado id de tipo Integer.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, false);
  if (!resultado.exito) assert.equal(resultado.codigo, 'ATRIBUTO_DUPLICADO');
});

test('no elige entre clases ambiguas ni crea clases inexistentes para agregar atributos', () => {
  const modelo = modeloConCliente();
  assert.equal(interpretarOrdenExplicita('Agrega a la clase Pedido un atributo llamado id de tipo Integer.', modelo, false), null);
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2' });
  assert.equal(interpretarOrdenExplicita('Agrega a la clase Cliente un atributo llamado nombre de tipo String.', modelo, false), null);
});

test('no reconoce consultas libres como intenciones deterministas', () => {
  assert.equal(interpretarOrdenExplicita('¿Qué clase debería crear?', modeloConCliente(), false), null);
  assert.equal(interpretarOrdenExplicita('Renombra Cliente a Persona.', modeloConCliente(), false), null);
});


test('renombra clase conservando identidad, atributos y relaciones', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Factura', atributos: [] });
  modelo.relaciones.push({
    id: 'r1', tipo: 'GENERALIZACION', idClaseOrigen: 'c1', idClaseDestino: 'c2',
    nombre: null, multiplicidadOrigen: null, multiplicidadDestino: null,
  });
  const intencion = interpretarOrdenExplicita('Renombra la clase Cliente a Comprador.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    assert.equal(resultado.contenido.clases[0].id, 'c1');
    assert.equal(resultado.contenido.clases[0].nombre, 'Comprador');
    assert.equal(resultado.contenido.clases[0].atributos[0].nombre, 'id');
    assert.equal(resultado.contenido.relaciones[0].idClaseOrigen, 'c1');
  }
  assert.equal(modelo.clases[0].nombre, 'Cliente');
});

test('renombrar una clase con nombre ocupado es rechazado por el ejecutor', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Factura' });
  const intencion = interpretarOrdenExplicita('Renombra la clase Cliente a Factura.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, false);
  if (!resultado.exito) assert.equal(resultado.codigo, 'CLASE_DUPLICADA');
});

test('modifica exclusivamente el tipo de un atributo existente', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Cambia el tipo del atributo id de la clase Cliente a String.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    const atributo = resultado.contenido.clases[0].atributos[0];
    assert.equal(atributo.id, 'a1');
    assert.equal(atributo.tipo, 'String');
    assert.equal(atributo.nombre, 'id');
    assert.equal(atributo.visibilidad, 'PRIVADA');
  }
  assert.equal(modelo.clases[0].atributos[0].tipo, 'Integer');
});

test('modifica nombre y visibilidad del atributo por órdenes individuales explícitas', () => {
  const modelo = modeloConCliente();
  const renombrar = interpretarOrdenExplicita('Renombra el atributo id de la clase Cliente a codigo.', modelo, false);
  assert.ok(renombrar);
  const renombrado = ejecutarIntencionSobreModelo(modelo, renombrar);
  assert.equal(renombrado.exito, true);
  if (!renombrado.exito) return;
  assert.equal(renombrado.contenido.clases[0].atributos[0].nombre, 'codigo');
  const cambiar = interpretarOrdenExplicita('Cambia la visibilidad del atributo codigo de la clase Cliente a pública.', renombrado.contenido, false);
  assert.ok(cambiar);
  const actualizado = ejecutarIntencionSobreModelo(renombrado.contenido, cambiar);
  assert.equal(actualizado.exito, true);
  if (actualizado.exito) assert.equal(actualizado.contenido.clases[0].atributos[0].visibilidad, 'PUBLICA');
});

test('evita atributos ambiguos, inexistentes y renombres de atributo duplicados', () => {
  const modelo = modeloConCliente();
  assert.equal(interpretarOrdenExplicita('Cambia el tipo del atributo nombre de la clase Cliente a Text.', modelo, false), null);
  modelo.clases[0].atributos.push({ ...modelo.clases[0].atributos[0], id: 'a2', nombre: 'nombre' });
  const renombrar = interpretarOrdenExplicita('Renombra el atributo id de la clase Cliente a nombre.', modelo, false);
  assert.ok(renombrar);
  const resultado = ejecutarIntencionSobreModelo(modelo, renombrar);
  assert.equal(resultado.exito, false);
  if (!resultado.exito) assert.equal(resultado.codigo, 'ATRIBUTO_DUPLICADO');
  modelo.clases[0].atributos.push({ ...modelo.clases[0].atributos[0], id: 'a3' });
  assert.equal(interpretarOrdenExplicita('Cambia el tipo del atributo id de la clase Cliente a String.', modelo, false), null);
});

test('no resuelve nombres ambiguos ni inexistentes para renombrar clases y modificar atributos', () => {
  const modelo = modeloConCliente();
  assert.equal(interpretarOrdenExplicita('Renombra la clase Pedido a Venta.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Cambia el tipo del atributo id de la clase Pedido a Text.', modelo, false), null);
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2' });
  assert.equal(interpretarOrdenExplicita('Renombra la clase Cliente a Comprador.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Cambia el tipo del atributo id de la clase Cliente a String.', modelo, false), null);
});

test('no toma ruta directa con instrucciones compuestas, ambiguas o contexto pendiente', () => {
  const modelo = modeloConCliente();
  assert.equal(interpretarOrdenExplicita('Renombra la clase Cliente a Comprador y elimínala.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Cambia el tipo del atributo id de la clase Cliente a String y borra la clase.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Cambia el tipo del atributo id de la clase Cliente.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Renombra la clase Cliente a Comprador.', modelo, true), null);
  assert.equal(interpretarOrdenExplicita('Cambia el tipo del atributo id de la clase Cliente a Text.', modelo, true), null);
});


test('configura persistencia e identificador con ambos datos explícitos', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Haz persistente la clase Cliente y utiliza id como identificador.', modelo, false);
  assert.ok(intencion);
  assert.equal(intencion.estado, 'LISTA');
  if (intencion.estado === 'LISTA') assert.equal(intencion.acciones[0].tipo, 'CONFIGURAR_PERSISTENCIA');
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    assert.deepEqual(resultado.contenido.clases[0].persistencia, { persistente: true, idAtributoIdentificador: 'a1' });
    assert.equal(resultado.contenido.clases[0].atributos[0].id, 'a1');
  }
  assert.deepEqual(modelo.clases[0].persistencia, { persistente: false, idAtributoIdentificador: null });
});

test('reconoce la orden natural de llave persistente utilizada en la prueba funcional', () => {
  const modelo = modeloConCliente();
  modelo.clases[0].nombre = 'Comprador';
  const intencion = interpretarOrdenExplicita('la clase comprador, el atributo id colocalo como llave persistente', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) assert.equal(resultado.contenido.clases[0].persistencia.idAtributoIdentificador, 'a1');
});

test('acepta marcar la clase persistente conservando un identificador existente', () => {
  const modelo = modeloConCliente();
  modelo.clases[0].persistencia = { persistente: true, idAtributoIdentificador: 'a1' };
  const intencion = interpretarOrdenExplicita('Marca la clase Cliente como persistente.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) assert.equal(resultado.contenido.clases[0].persistencia.idAtributoIdentificador, 'a1');
});

test('desactivar persistencia elimina también el identificador configurado', () => {
  const modelo = modeloConCliente();
  modelo.clases[0].persistencia = { persistente: true, idAtributoIdentificador: 'a1' };
  const intencion = interpretarOrdenExplicita('Desactiva la persistencia de la clase Cliente.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) assert.deepEqual(resultado.contenido.clases[0].persistencia, { persistente: false, idAtributoIdentificador: null });
  assert.equal(modelo.clases[0].persistencia.idAtributoIdentificador, 'a1');
});

test('rechaza un identificador que no existe sin modificar el contenido original', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Haz persistente la clase Cliente y utiliza codigo como identificador.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, false);
  if (!resultado.exito) assert.equal(resultado.codigo, 'ATRIBUTO_NO_ENCONTRADO');
  assert.equal(modelo.clases[0].persistencia.persistente, false);
});

test('no escoge clases ni identificadores ambiguos en persistencia', () => {
  const modelo = modeloConCliente();
  modelo.clases[0].atributos.push({ ...modelo.clases[0].atributos[0], id: 'a2' });
  assert.equal(interpretarOrdenExplicita('Haz persistente la clase Cliente y utiliza id como identificador.', modelo, false), null);
  modelo.clases[0].atributos.pop();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2' });
  assert.equal(interpretarOrdenExplicita('Haz persistente la clase Cliente y utiliza id como identificador.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Desactiva la persistencia de la clase Cliente.', modelo, false), null);
});

test('agrega una operación sencilla sin parámetros y con retorno explícito', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Agrega a Cliente la operación obtenerNombre que retorna String.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    const operacion = resultado.contenido.clases[0].operaciones[0];
    assert.equal(operacion.nombre, 'obtenerNombre');
    assert.equal(operacion.tipoRetorno, 'String');
    assert.deepEqual(operacion.parametros, []);
    assert.equal(operacion.visibilidad, 'PUBLICA');
  }
  assert.equal(modelo.clases[0].operaciones.length, 0);
});

test('admite operación sin parámetros cuando se indica expresamente', () => {
  const modelo = modeloConCliente();
  const intencion = interpretarOrdenExplicita('Agrega a la clase Cliente una operación llamada guardar sin parámetros.', modelo, false);
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    assert.equal(resultado.contenido.clases[0].operaciones[0].tipoRetorno, null);
    assert.deepEqual(resultado.contenido.clases[0].operaciones[0].parametros, []);
  }
});

test('evita ejecutar dos veces una operación sin parámetros con la misma firma', () => {
  const modelo = modeloConCliente();
  const crear = interpretarOrdenExplicita('Agrega a la clase Cliente una operación llamada obtenerNombre que retorna String.', modelo, false);
  assert.ok(crear);
  const primera = ejecutarIntencionSobreModelo(modelo, crear);
  assert.equal(primera.exito, true);
  if (!primera.exito) return;
  const repetida = interpretarOrdenExplicita('Agrega a la clase Cliente una operación llamada obtenerNombre que retorna Integer.', primera.contenido, false);
  assert.ok(repetida);
  assert.equal(repetida.estado, 'NO_SOPORTADA');
  assert.equal(primera.contenido.clases[0].operaciones.length, 1);
});

test('no ejecuta operaciones ambiguas, con parámetros no modelados o compuestas', () => {
  const modelo = modeloConCliente();
  assert.equal(interpretarOrdenExplicita('Agrega a Cliente la operación guardar.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Agrega a Cliente la operación guardar que recibe id Integer y retorna Boolean.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Agrega a Cliente la operación guardar que retorna Boolean y elimina Cliente.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Agrega a Factura la operación guardar que retorna Boolean.', modelo, false), null);
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2' });
  assert.equal(interpretarOrdenExplicita('Agrega a Cliente la operación guardar que retorna Boolean.', modelo, false), null);
});

test('sin atributos identificadores no inventa persistencia ni omite contexto pendiente', () => {
  const modelo = modeloConCliente();
  assert.equal(interpretarOrdenExplicita('Haz persistente la clase Cliente y utiliza como identificador.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Haz persistente la clase Cliente y utiliza id como identificador y elimina la clase.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Haz persistente la clase Cliente y utiliza id como identificador.', modelo, true), null);
  assert.equal(interpretarOrdenExplicita('Agrega a Cliente la operación guardar que retorna Boolean.', modelo, true), null);
});


test('crea generalización hija a padre sin multiplicidades y sin mutar la entrada', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Persona' });
  const intencion = interpretarOrdenExplicita('Crea una generalización donde Cliente hereda de Persona.', modelo, false);
  assert.ok(intencion);
  assert.equal(intencion.estado, 'LISTA');
  if (intencion.estado === 'LISTA') {
    assert.deepEqual(intencion.acciones[0], {
      tipo: 'CREAR_RELACION', origen: { id: 'c1', nombre: undefined },
      destino: { id: 'c2', nombre: undefined }, tipoRelacion: 'GENERALIZACION',
    });
  }
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    assert.equal(resultado.contenido.relaciones[0].idClaseOrigen, 'c1');
    assert.equal(resultado.contenido.relaciones[0].idClaseDestino, 'c2');
    assert.equal(resultado.contenido.relaciones[0].multiplicidadOrigen, null);
    assert.equal(resultado.contenido.relaciones[0].multiplicidadDestino, null);
  }
  assert.deepEqual(modelo.relaciones, []);
});

test('crea asociación respetando los extremos y cardinalidades explícitas', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  const intencion = interpretarOrdenExplicita(
    'Crea una asociación de Cliente hacia Direccion con multiplicidad de origen 1 y de destino 0..*.',
    modelo, false,
  );
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    const relacion = resultado.contenido.relaciones[0];
    assert.equal(relacion.tipo, 'ASOCIACION');
    assert.equal(relacion.idClaseOrigen, 'c1');
    assert.equal(relacion.idClaseDestino, 'c2');
    assert.equal(relacion.multiplicidadOrigen, '1');
    assert.equal(relacion.multiplicidadDestino, '0..*');
  }
});

test('acepta multiplicidades referidas por nombre solo si corresponden a los extremos', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  const valida = interpretarOrdenExplicita(
    'Crea una asociación de Cliente hacia Direccion con multiplicidad en Cliente 0..1 y en Direccion *.',
    modelo, false,
  );
  assert.ok(valida);
  const resultado = ejecutarIntencionSobreModelo(modelo, valida);
  assert.equal(resultado.exito, true);
  if (resultado.exito) assert.deepEqual(
    [resultado.contenido.relaciones[0].multiplicidadOrigen, resultado.contenido.relaciones[0].multiplicidadDestino],
    ['0..1', '*'],
  );
  assert.equal(interpretarOrdenExplicita(
    'Crea una asociación de Cliente hacia Direccion con multiplicidad en Direccion 1 y en Cliente *.',
    modelo, false,
  ), null);
});

test('crea composición de todo a parte con multiplicidades explícitas', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  const intencion = interpretarOrdenExplicita(
    'Crea una composición donde Cliente es el todo y Direccion es la parte, con multiplicidad de origen 1 y de destino 0..*.',
    modelo, false,
  );
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    const relacion = resultado.contenido.relaciones[0];
    assert.equal(relacion.tipo, 'COMPOSICION');
    assert.equal(relacion.idClaseOrigen, 'c1');
    assert.equal(relacion.idClaseDestino, 'c2');
    assert.equal(relacion.multiplicidadOrigen, '1');
    assert.equal(relacion.multiplicidadDestino, '0..*');
  }
});

test('crea agregación con todo y parte y conserva el resto del modelo', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  const intencion = interpretarOrdenExplicita(
    'Crea una agregación donde Cliente es el todo y Direccion es la parte con multiplicidad de origen 1 y de destino 1..*.',
    modelo, false,
  );
  assert.ok(intencion);
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (resultado.exito) {
    const relacion = resultado.contenido.relaciones[0];
    assert.equal(relacion.tipo, 'AGREGACION');
    assert.equal(relacion.idClaseOrigen, 'c1');
    assert.equal(relacion.idClaseDestino, 'c2');
    assert.equal(relacion.multiplicidadOrigen, '1');
    assert.equal(relacion.multiplicidadDestino, '1..*');
    assert.equal(resultado.contenido.clases[0].atributos[0].nombre, 'id');
  }
});

test('rechaza mediante el ejecutor la relación equivalente duplicada', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Persona' });
  const texto = 'Crea una generalización donde Cliente hereda de Persona.';
  const primera = interpretarOrdenExplicita(texto, modelo, false);
  assert.ok(primera);
  const resultado = ejecutarIntencionSobreModelo(modelo, primera);
  assert.equal(resultado.exito, true);
  if (!resultado.exito) return;
  const duplicada = interpretarOrdenExplicita(texto, resultado.contenido, false);
  assert.ok(duplicada);
  const rechazado = ejecutarIntencionSobreModelo(resultado.contenido, duplicada);
  assert.equal(rechazado.exito, false);
  if (!rechazado.exito) assert.equal(rechazado.codigo, 'RELACION_DUPLICADA');
  assert.equal(resultado.contenido.relaciones.length, 1);
});

test('no inventa multiplicidades, sentidos ni tipos de relación ausentes', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  assert.equal(interpretarOrdenExplicita('Relaciona Cliente y Direccion.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una asociación de Cliente hacia Direccion.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una asociación de Cliente hacia Direccion con multiplicidad de origen 1.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una asociación de Cliente hacia Direccion con multiplicidad de origen 7 y de destino 1.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una composición de Cliente hacia Direccion con multiplicidad de origen 1 y de destino 1.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una generalización donde Cliente hereda de Direccion con multiplicidad 1.', modelo, false), null);
});

test('no usa ruta directa con clases inexistentes, ambiguas, autorrelaciones o contexto pendiente', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  const herencia = 'Crea una generalización donde Cliente hereda de Direccion.';
  const composicion = 'Crea una composición donde Cliente es el todo y Direccion es la parte con multiplicidad de origen 1 y de destino 0..*.';
  assert.equal(interpretarOrdenExplicita(herencia, modelo, true), null);
  assert.equal(interpretarOrdenExplicita(composicion, modelo, true), null);
  assert.equal(interpretarOrdenExplicita('Crea una generalización donde Cliente hereda de Inexistente.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una generalización donde Cliente hereda de Cliente.', modelo, false), null);
  assert.equal(interpretarOrdenExplicita('Crea una composición donde Cliente es el todo y Cliente es la parte con multiplicidad de origen 1 y de destino 1.', modelo, false), null);
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c3' });
  assert.equal(interpretarOrdenExplicita(herencia, modelo, false), null);
  assert.equal(interpretarOrdenExplicita(composicion, modelo, false), null);
});

test('remite órdenes compuestas a WebLLM sin ejecutarlas directamente', () => {
  const modelo = modeloConCliente();
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  assert.equal(interpretarOrdenExplicita(
    'Crea una generalización donde Cliente hereda de Direccion y elimina Cliente.', modelo, false,
  ), null);
  assert.equal(interpretarOrdenExplicita(
    'Crea una asociación de Cliente hacia Direccion con multiplicidad de origen 1 y de destino 0..* y borra Direccion.', modelo, false,
  ), null);
});


test('reconoce la asociación en la formulación exacta de la prueba funcional v22', () => {
  const modelo = modeloConCliente();
  modelo.clases[0].nombre = 'Comprador';
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  const original = structuredClone(modelo);
  const texto = 'Crea una asociación de Comprador hacia Direccion con multiplicidad 1 en origen y 0..* en destino.';
  const intencion = interpretarOrdenExplicita(texto, modelo, false);
  assert.ok(intencion, 'debe reconocer la orden sin recurrir a WebLLM');
  assert.equal(intencion.estado, 'LISTA');
  const resultado = ejecutarIntencionSobreModelo(modelo, intencion);
  assert.equal(resultado.exito, true);
  if (!resultado.exito) return;
  const relacion = resultado.contenido.relaciones[0];
  assert.equal(relacion.tipo, 'ASOCIACION');
  assert.equal(relacion.idClaseOrigen, 'c1');
  assert.equal(relacion.idClaseDestino, 'c2');
  assert.equal(relacion.multiplicidadOrigen, '1');
  assert.equal(relacion.multiplicidadDestino, '0..*');
  assert.deepEqual(modelo, original, 'la ejecución debe conservar el modelo original');

  const repetida = interpretarOrdenExplicita(texto, resultado.contenido, false);
  assert.ok(repetida);
  const rechazo = ejecutarIntencionSobreModelo(resultado.contenido, repetida);
  assert.equal(rechazo.exito, false);
  if (!rechazo.exito) assert.equal(rechazo.codigo, 'RELACION_DUPLICADA');
  assert.equal(resultado.contenido.relaciones.length, 1);
});

test('la variante 1 en origen / 0..* en destino exige ambos valores válidos y una sola orden', () => {
  const modelo = modeloConCliente();
  modelo.clases[0].nombre = 'Comprador';
  modelo.clases.push({ ...structuredClone(modelo.clases[0]), id: 'c2', nombre: 'Direccion' });
  const ordenesNoDirectas = [
    'Crea una asociación de Comprador hacia Direccion con multiplicidad 1 en origen.',
    'Crea una asociación de Comprador hacia Direccion con multiplicidad 1 en destino y 0..* en origen.',
    'Crea una asociación de Comprador hacia Direccion con multiplicidad 2 en origen y 0..* en destino.',
    'Crea una asociación de Comprador hacia Direccion con multiplicidad 1 en origen y 7 en destino.',
    'Crea una asociación de Comprador hacia Direccion con multiplicidad 1 en origen y 0..* en destino y borra Comprador.',
    'Crea una asociación de Comprador hacia ClienteInexistente con multiplicidad 1 en origen y 0..* en destino.',
    'Crea una asociación de Comprador hacia Comprador con multiplicidad 1 en origen y 0..* en destino.',
  ];
  for (const orden of ordenesNoDirectas) {
    assert.equal(interpretarOrdenExplicita(orden, modelo, false), null, orden);
  }
  const valida = 'Crea una asociación de Comprador hacia Direccion con multiplicidad 1 en origen y 0..* en destino.';
  assert.equal(interpretarOrdenExplicita(valida, modelo, true), null, 'contexto pendiente');
  modelo.clases.push({ ...structuredClone(modelo.clases[1]), id: 'c3' });
  assert.equal(interpretarOrdenExplicita(valida, modelo, false), null, 'referencia a destino ambiguo');
});
