import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import { ObtenerModeloUmlUseCase } from '../../../pa02-modelado-interoperabilidad-uml/application/use-cases/cu05-modelar-diagrama-clases/obtener-modelo-uml.use-case';
import { ModeloUmlNoEncontradoError } from '../../../pa02-modelado-interoperabilidad-uml/domain/errors/modelo-uml-no-encontrado.error';
import type { ModeloUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import type { MensajeIa } from '../../domain/models/conversacion-ia';
import { ProveedorIaPort } from '../ports/proveedor-ia.port';
import { Cu12ConversacionesIaService } from './cu12-conversaciones-ia.service';
import {
  Cu13AnalizarModeloUmlService,
  construirMensajesAnalisisModelo,
  construirResumenModeloAnalisis,
} from './cu13-analizar-modelo-uml.service';

const usuario = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const proyecto = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const conversacion = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const idModelo = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const solicitud = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const pregunta = '¿Qué opinas de las relaciones Cliente y Venta?';
const mensaje: MensajeIa = {
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  idConversacion: conversacion,
  idUsuario: usuario,
  identificadorSolicitud: solicitud,
  contenido: pregunta,
  tipoEmisor: 'USUARIO',
  fechaCreacion: new Date('2026-11-05T12:00:00Z'),
};
const respuesta: MensajeIa = {
  ...mensaje,
  id: '11111111-1111-4111-8111-111111111111',
  idUsuario: null,
  tipoEmisor: 'IA',
  contenido: 'Observación sobre Venta y Cliente.',
};
const modelo: ModeloUml = {
  id: idModelo,
  idProyecto: proyecto,
  nombre: 'Sistema de ventas',
  descripcion: 'Descripción que no se enviará al proveedor',
  estado: 'ACTIVO',
  version: 7,
  fechaCreacion: new Date('2026-11-05T12:00:00Z'),
  fechaActualizacion: new Date('2026-11-05T12:01:00Z'),
  contenido: {
    versionEsquema: 1,
    clases: [
      {
        id: 'c1', nombre: 'Cliente', posicion: { x: 120, y: 220 },
        atributos: [{ id: 'a1', nombre: 'email', tipo: 'String', visibilidad: 'PRIVADA' }],
        operaciones: [{ id: 'o1', nombre: 'comprar', tipoRetorno: 'Venta', visibilidad: 'PUBLICA', parametros: [{ id: 'p1', nombre: 'cantidad', tipo: 'Integer' }] }],
        persistencia: { persistente: true, idAtributoIdentificador: 'a1' },
      },
      {
        id: 'c2', nombre: 'Venta', posicion: { x: 300, y: 400 },
        atributos: [], operaciones: [],
        persistencia: { persistente: false, idAtributoIdentificador: null },
      },
    ],
    relaciones: [{ id: 'r1', tipo: 'ASOCIACION', idClaseOrigen: 'c1', idClaseDestino: 'c2', nombre: null, multiplicidadOrigen: '1', multiplicidadDestino: '0..*' }],
    configuracion: { __colaboracion: { estadoYjsBase64: 'SECRET-A-OMITIR' }, secreto: 'NO-ENVIAR' },
  },
};

describe('CU13 bloque 7: modelo persistido, autorizado y solo lectura', () => {
  let service: Cu13AnalizarModeloUmlService;
  let obtenerModelo: jest.Mock;
  let enviarMensaje: jest.Mock;
  let listarMensajes: jest.Mock;
  let guardarRespuestaIa: jest.Mock;
  let generar: jest.Mock;

  beforeEach(() => {
    obtenerModelo = jest.fn().mockResolvedValue(modelo);
    enviarMensaje = jest.fn().mockResolvedValue(mensaje);
    listarMensajes = jest.fn().mockResolvedValue([mensaje]);
    guardarRespuestaIa = jest.fn().mockResolvedValue(respuesta);
    generar = jest.fn().mockResolvedValue({ tipo: 'texto', contenido: respuesta.contenido });
    service = new Cu13AnalizarModeloUmlService(
      { execute: obtenerModelo } as unknown as ObtenerModeloUmlUseCase,
      { enviarMensaje, listarMensajes, guardarRespuestaIa } as unknown as Cu12ConversacionesIaService,
      { generar } as unknown as ProveedorIaPort,
    );
  });

  it('envía sólo los campos UML necesarios de la versión autorizada, sin Yjs ni metadatos privados', async () => {
    const salida = await service.analizar(usuario, proyecto, conversacion, idModelo, pregunta);
    expect(obtenerModelo).toHaveBeenCalledWith(usuario, proyecto, idModelo);
    expect(obtenerModelo).toHaveBeenCalledTimes(2);
    expect(salida).toEqual({
      mensajeUsuario: mensaje, mensajeIa: respuesta, modoRespuesta: 'GROQ',
      modeloAnalizado: { id: idModelo, nombre: modelo.nombre, version: 7 },
    });
    expect(guardarRespuestaIa).toHaveBeenCalledWith(
      usuario, proyecto, conversacion, solicitud,
      expect.stringContaining('Análisis contextual del modelo «Sistema de ventas» (versión persistida v7)'),
    );
    const solicitudIa = generar.mock.calls[0][0] as { mensajes: Array<{ rol: string; contenido: string }> };
    const enviado = JSON.stringify(solicitudIa.mensajes);
    expect(enviado).toContain('Cliente');
    expect(enviado).toContain('Venta');
    expect(enviado).toContain('0..*');
    expect(enviado).toContain('versionPersistida');
    expect(enviado).not.toContain('SECRET-A-OMITIR');
    expect(enviado).not.toContain('NO-ENVIAR');
    expect(enviado).not.toContain('Descripción que no se enviará');
    expect(enviado).not.toContain('120');
    expect(solicitudIa.mensajes.at(-1)).toEqual({ rol: 'usuario', contenido: pregunta });
  });

  it('rechaza autorización MODELO/CONSULTAR y no escribe ni solicita a IA', async () => {
    obtenerModelo.mockRejectedValue(new OperacionProyectoNoAutorizadaError());
    await expect(service.analizar(usuario, proyecto, conversacion, idModelo, pregunta)).rejects.toBeInstanceOf(ForbiddenException);
    expect(enviarMensaje).not.toHaveBeenCalled();
    expect(generar).not.toHaveBeenCalled();
  });

  it('rechaza modelo inexistente o de otro proyecto sin filtrar contexto ni guardar pregunta', async () => {
    obtenerModelo.mockRejectedValue(new ModeloUmlNoEncontradoError());
    await expect(service.analizar(usuario, proyecto, conversacion, idModelo, pregunta)).rejects.toBeInstanceOf(NotFoundException);
    expect(enviarMensaje).not.toHaveBeenCalled();
    expect(generar).not.toHaveBeenCalled();
  });

  it('no invoca IA si la conversación está archivada o no autorizada', async () => {
    enviarMensaje.mockRejectedValue(new NotFoundException());
    await expect(service.analizar(usuario, proyecto, conversacion, idModelo, pregunta)).rejects.toBeInstanceOf(NotFoundException);
    expect(generar).not.toHaveBeenCalled();
  });

  it('no envía al proveedor un modelo demasiado grande, ni registra mensajes', async () => {
    const largo: ModeloUml = { ...modelo, contenido: { ...modelo.contenido, clases: Array.from({ length: 61 }, (_, i) => ({ ...modelo.contenido.clases[0], id: `clase-${i}` })) } };
    obtenerModelo.mockResolvedValue(largo);
    await expect(service.analizar(usuario, proyecto, conversacion, idModelo, pregunta)).rejects.toBeInstanceOf(BadRequestException);
    expect(enviarMensaje).not.toHaveBeenCalled();
    expect(generar).not.toHaveBeenCalled();
  });

  it('no guarda respuesta obsoleta si la versión cambia mientras Groq analiza', async () => {
    obtenerModelo.mockResolvedValueOnce(modelo).mockResolvedValueOnce({ ...modelo, version: 8 });
    await expect(service.analizar(usuario, proyecto, conversacion, idModelo, pregunta)).rejects.toBeInstanceOf(ConflictException);
    expect(enviarMensaje).toHaveBeenCalledTimes(1);
    expect(guardarRespuestaIa).not.toHaveBeenCalled();
  });

  it('revalida el acceso al modelo tras el proveedor y no conserva respuesta si pierde permiso', async () => {
    obtenerModelo.mockResolvedValueOnce(modelo).mockRejectedValueOnce(new OperacionProyectoNoAutorizadaError());
    await expect(service.analizar(usuario, proyecto, conversacion, idModelo, pregunta)).rejects.toBeInstanceOf(ForbiddenException);
    expect(guardarRespuestaIa).not.toHaveBeenCalled();
  });

  it('ante una consulta sobre Cliente antepone hechos verificables, aun si el proveedor se equivoca', async () => {
    const casoReal: ModeloUml = {
      ...modelo,
      contenido: { ...modelo.contenido, relaciones: [
        { ...modelo.contenido.relaciones[0], idClaseOrigen: 'c2', idClaseDestino: 'c1', multiplicidadOrigen: '0..*', multiplicidadDestino: '1' },
      ] },
    };
    obtenerModelo.mockResolvedValue(casoReal);
    generar.mockResolvedValue({ tipo: 'texto', contenido: 'La IA podría invertir el sentido por error.' });
    await service.analizar(usuario, proyecto, conversacion, idModelo, 'Explica la clase Cliente');
    const contenido = guardarRespuestaIa.mock.calls[0][4] as string;
    const seccion = contenido.indexOf('Lectura UML verificada');
    const observaciones = contenido.indexOf('Observaciones de la IA');
    expect(seccion).toBeGreaterThan(0);
    expect(observaciones).toBeGreaterThan(seccion);
    expect(contenido).toContain('Cada instancia de «Venta» se relaciona con exactamente una instancia de «Cliente».');
    expect(contenido).toContain('Cada instancia de «Cliente» se relaciona con cero o más instancias de «Venta».');
    const prompt = JSON.stringify(generar.mock.calls[0][0].mensajes);
    expect(prompt).toContain('LECTURAS UML COMPROBADAS POR EL SERVIDOR');
    expect(prompt).toContain('cantidadDestinosPorOrigen');
    expect(prompt).not.toContain('SECRET-A-OMITIR');
  });

  it('produce un respaldo transparente cuando falla GroqCloud, sin revelar datos técnicos', async () => {
    generar.mockRejectedValue(new Error('clave privada SECRET-API'));
    const salida = await service.analizar(usuario, proyecto, conversacion, idModelo, pregunta);
    expect(salida.modoRespuesta).toBe('RESPALDO');
    const contenido = guardarRespuestaIa.mock.calls[0][4] as string;
    expect(contenido).toContain('no se generó un análisis');
    expect(contenido).not.toContain('SECRET-API');
  });

  it('preserva la correlación UUID en consultas concurrentes', async () => {
    const segundo: MensajeIa = { ...mensaje, id: '22222222-2222-4222-8222-222222222222', identificadorSolicitud: '33333333-3333-4333-8333-333333333333' };
    enviarMensaje.mockResolvedValueOnce(mensaje).mockResolvedValueOnce(segundo);
    guardarRespuestaIa.mockImplementation(async (_u: string, _p: string, _c: string, id: string) => ({ ...respuesta, identificadorSolicitud: id }));
    const salidas = await Promise.all([
      service.analizar(usuario, proyecto, conversacion, idModelo, 'Pregunta A'),
      service.analizar(usuario, proyecto, conversacion, idModelo, 'Pregunta B'),
    ]);
    expect(salidas[0].mensajeIa.identificadorSolicitud).toBe(solicitud);
    expect(salidas[1].mensajeIa.identificadorSolicitud).toBe(segundo.identificadorSolicitud);
  });
});

describe('construcción del contexto UML', () => {
  it('preserva relaciones y firma de operaciones, sin incluir posiciones ni configuración', () => {
    const contexto = construirResumenModeloAnalisis(modelo);
    const datos = JSON.parse(contexto) as { clases: Array<{ operaciones: unknown[] }>; relaciones: unknown[] };
    expect(datos.clases).toHaveLength(2);
    expect(datos.relaciones).toHaveLength(1);
    expect(JSON.stringify(datos.clases[0].operaciones)).toContain('comprar');
    expect(contexto).not.toContain('posicion');
    expect(contexto).not.toContain('configuracion');
  });

  it('expone explícitamente la lectura de cardinalidad cruzada en el JSON autorizado', () => {
    const ventaOrigen: ModeloUml = {
      ...modelo,
      contenido: { ...modelo.contenido, relaciones: [
        { ...modelo.contenido.relaciones[0], idClaseOrigen: 'c2', idClaseDestino: 'c1', multiplicidadOrigen: '0..*', multiplicidadDestino: '1' },
      ] },
    };
    const datos = JSON.parse(construirResumenModeloAnalisis(ventaOrigen)) as {
      relaciones: Array<{ claseOrigen: string; claseDestino: string; cantidadDestinosPorOrigen: string; cantidadOrigenesPorDestino: string }>;
    };
    expect(datos.relaciones[0]).toEqual(expect.objectContaining({
      claseOrigen: 'Venta', claseDestino: 'Cliente',
      cantidadDestinosPorOrigen: '1', cantidadOrigenesPorDestino: '0..*',
    }));
  });

  it('entrega las lecturas verificadas al proveedor antes de la pregunta cuando corresponden', () => {
    const lecturas = 'Cada instancia de «Venta» se relaciona con exactamente una instancia de «Cliente».';
    const msgs = construirMensajesAnalisisModelo([mensaje], mensaje, construirResumenModeloAnalisis(modelo), lecturas);
    expect(msgs.at(-2)?.contenido).toContain(lecturas);
    expect(msgs.at(-1)?.contenido).toBe(pregunta);
  });

  it('mantiene sólo el historial de esta conversación y no duplica pregunta actual', () => {
    const contexto = construirMensajesAnalisisModelo([mensaje], mensaje, construirResumenModeloAnalisis(modelo));
    expect(contexto.map((m) => m.rol)).toEqual(['sistema', 'usuario', 'usuario']);
    expect(contexto.at(-1)?.contenido).toBe(pregunta);
    expect(contexto[1].contenido).toContain('versionPersistida');
  });
});
