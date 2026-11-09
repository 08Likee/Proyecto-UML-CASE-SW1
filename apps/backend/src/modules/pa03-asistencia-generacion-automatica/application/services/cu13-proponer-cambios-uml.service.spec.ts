import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperacionProyectoNoAutorizadaError } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/domain/errors/operacion-proyecto-no-autorizada.error';
import { ObtenerModeloUmlUseCase } from '../../../pa02-modelado-interoperabilidad-uml/application/use-cases/cu05-modelar-diagrama-clases/obtener-modelo-uml.use-case';
import { ModeloUmlNoEncontradoError } from '../../../pa02-modelado-interoperabilidad-uml/domain/errors/modelo-uml-no-encontrado.error';
import type { ModeloUml } from '../../../pa02-modelado-interoperabilidad-uml/domain/models/modelo-uml';
import { AutorizacionProyectoService } from '../../../pa01-gestion-usuarios-proyectos-colaborativos/application/services/autorizacion-proyecto.service';
import { ProveedorIaPort } from '../ports/proveedor-ia.port';
import { PropuestasUmlIaRepository } from '../ports/propuestas-uml-ia.repository';
import { Cu12ConversacionesIaService } from './cu12-conversaciones-ia.service';
import { Cu13ProponerCambiosUmlService } from './cu13-proponer-cambios-uml.service';

const u = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const p = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const c = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const m = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const idMensaje = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const uuidPropuesta = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const pregunta = 'Propón una clase Factura relacionada con Venta';
const mensaje = { id: idMensaje, identificadorSolicitud: '11111111-1111-4111-8111-111111111111', idConversacion: c, contenido: pregunta, idUsuario: u, tipoEmisor: 'USUARIO', fechaCreacion: new Date() };
const respuestaIa = { ...mensaje, id: '22222222-2222-4222-8222-222222222222', idUsuario: null, tipoEmisor: 'IA' };
const modelo: ModeloUml = {
  id: m, idProyecto: p, nombre: 'Sistema de ventas', descripcion: null, estado: 'ACTIVO', version: 7,
  fechaCreacion: new Date(), fechaActualizacion: new Date(),
  contenido: { versionEsquema: 1, configuracion: { __colaboracion: { yjs: 'NO-ENVIAR' } },
    clases: [{ id: 'v1', nombre: 'Venta', atributos: [], operaciones: [], posicion: { x: 150, y: 90 }, persistencia: { persistente: false, idAtributoIdentificador: null } }], relaciones: [] },
};
const datos = { resumen: 'Añadir Factura', clasesNuevas: [{ nombre: 'Factura', atributos: [{ nombre: 'numero', tipo: 'String', visibilidad: 'PRIVADA' }] }], atributosEnClasesExistentes: [], relacionesNuevas: [{ tipo: 'ASOCIACION', claseOrigen: 'Venta', claseDestino: 'Factura', nombre: null, multiplicidadOrigen: '1', multiplicidadDestino: '0..1' }] };
const propuesta = { id: uuidPropuesta, idProyecto: p, idModelo: m, idConversacion: c, idCreador: u, idMensajeUsuario: idMensaje, versionModelo: 7, versionActual: 7, vigente: true, estado: 'PENDIENTE', datos, fechaCreacion: new Date() };

describe('CU13 bloque 8.1 — generación y revisión sin modificación UML', () => {
  let servicio: Cu13ProponerCambiosUmlService;
  let obtenerModelo: jest.Mock, obtenerConversacion: jest.Mock, enviar: jest.Mock, mensajes: jest.Mock, responder: jest.Mock;
  let generar: jest.Mock, crear: jest.Mock, listar: jest.Mock, rechazar: jest.Mock, aplicar: jest.Mock, exigir: jest.Mock;
  beforeEach(() => {
    obtenerModelo = jest.fn().mockResolvedValue(modelo);
    obtenerConversacion = jest.fn().mockResolvedValue({ estado: 'ACTIVA' });
    enviar = jest.fn().mockResolvedValue(mensaje);
    mensajes = jest.fn().mockResolvedValue([mensaje]);
    responder = jest.fn().mockResolvedValue(respuestaIa);
    generar = jest.fn().mockResolvedValue({ tipo: 'json_estructurado', contenido: datos });
    crear = jest.fn().mockResolvedValue(propuesta);
    listar = jest.fn().mockResolvedValue([propuesta]);
    rechazar = jest.fn().mockResolvedValue({ ...propuesta, estado: 'RECHAZADA' });
    aplicar = jest.fn().mockResolvedValue({ propuesta: { ...propuesta, estado: 'APLICADA' }, modelo: { id: m, version: 8, contenido: modelo.contenido }, estadoYjsBase64: 'ZmFrZQ==' });
    exigir = jest.fn().mockResolvedValue(undefined);
    servicio = new Cu13ProponerCambiosUmlService(
      { execute: obtenerModelo } as unknown as ObtenerModeloUmlUseCase,
      { obtener: obtenerConversacion, enviarMensaje: enviar, listarMensajes: mensajes, guardarRespuestaIa: responder } as unknown as Cu12ConversacionesIaService,
      { generar } as unknown as ProveedorIaPort,
      { crear, listar, rechazar, aplicar } as unknown as PropuestasUmlIaRepository,
      { exigirPermiso: exigir } as unknown as AutorizacionProyectoService,
    );
  });

  it('usa JSON estricto y modelo autorizado, y guarda una propuesta separada del UML', async () => {
    const r = await servicio.generar(u, p, c, m, pregunta);
    expect(r.propuesta?.id).toBe(uuidPropuesta);
    expect(obtenerModelo).toHaveBeenCalledTimes(2);
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ idProyecto: p, idModelo: m, idConversacion: c, versionModelo: 7, idMensajeUsuario: idMensaje }));
    expect(generar.mock.calls[0][0].formato.tipo).toBe('json_estructurado');
    const enviado = JSON.stringify(generar.mock.calls[0][0]);
    expect(enviado).toContain('Venta');
    expect(enviado).not.toContain('NO-ENVIAR');
    expect(enviado).not.toContain('150');
    expect(responder).toHaveBeenCalledWith(u, p, c, mensaje.identificadorSolicitud, expect.stringContaining('Al generar esta propuesta no se modificó el modelo UML'));
  });
  it('no filtra contexto ni guarda la pregunta sin MODELO/CONSULTAR', async () => {
    obtenerModelo.mockRejectedValue(new OperacionProyectoNoAutorizadaError());
    await expect(servicio.generar(u, p, c, m, pregunta)).rejects.toBeInstanceOf(ForbiddenException);
    expect(enviar).not.toHaveBeenCalled(); expect(generar).not.toHaveBeenCalled(); expect(crear).not.toHaveBeenCalled();
  });
  it('rechaza un modelo de otro proyecto antes de enviar', async () => {
    obtenerModelo.mockRejectedValue(new ModeloUmlNoEncontradoError());
    await expect(servicio.generar(u, p, c, m, pregunta)).rejects.toBeInstanceOf(NotFoundException);
    expect(generar).not.toHaveBeenCalled();
  });
  it('no genera en una conversación archivada', async () => {
    obtenerConversacion.mockResolvedValue({ estado: 'ARCHIVADA' });
    await expect(servicio.generar(u, p, c, m, pregunta)).rejects.toBeInstanceOf(ConflictException);
    expect(enviar).not.toHaveBeenCalled(); expect(generar).not.toHaveBeenCalled();
  });
  it('rechaza versiones cambiadas tras Groq, sin guardar propuesta', async () => {
    obtenerModelo.mockResolvedValueOnce(modelo).mockResolvedValueOnce({ ...modelo, version: 8 });
    await expect(servicio.generar(u, p, c, m, pregunta)).rejects.toBeInstanceOf(ConflictException);
    expect(crear).not.toHaveBeenCalled(); expect(responder).not.toHaveBeenCalled();
  });
  it('un JSON no válido o fallo del proveedor deja aviso, nunca una propuesta inventada', async () => {
    generar.mockResolvedValue({ tipo: 'json_estructurado', contenido: { ...datos, clasesNuevas: [{ nombre: 'Venta', atributos: [] }] } });
    const r = await servicio.generar(u, p, c, m, pregunta);
    expect(r.propuesta).toBeNull(); expect(r.modoRespuesta).toBe('RESPALDO');
    expect(crear).not.toHaveBeenCalled();
    expect(responder).toHaveBeenCalledWith(u, p, c, mensaje.identificadorSolicitud, expect.stringContaining('no se modificó'));
  });
  it('puede listar propuestas persistidas tras F5 solo con contexto autorizado', async () => {
    expect(await servicio.listar(u, p, c, m)).toEqual([propuesta]);
    expect(listar).toHaveBeenCalledWith(u, p, m, c);
    expect(obtenerModelo).toHaveBeenCalled(); expect(obtenerConversacion).toHaveBeenCalled();
  });
  it('requiere MODELO/EDITAR para rechazar, sin afectar el UML', async () => {
    exigir.mockRejectedValue(new OperacionProyectoNoAutorizadaError());
    await expect(servicio.rechazar(u, p, c, m, uuidPropuesta)).rejects.toBeInstanceOf(ForbiddenException);
    expect(rechazar).not.toHaveBeenCalled();
    exigir.mockResolvedValue(undefined);
    const r = await servicio.rechazar(u, p, c, m, uuidPropuesta);
    expect(r.estado).toBe('RECHAZADA');
    expect(exigir).toHaveBeenCalledWith(u, p, 'MODELO', 'EDITAR');
    expect(rechazar).toHaveBeenCalledWith(u, p, m, c, uuidPropuesta);
  });
  it('requiere MODELO/EDITAR para aplicar desde la API, incluso si la tarjeta es visible', async () => {
    exigir.mockRejectedValue(new OperacionProyectoNoAutorizadaError());
    await expect(servicio.aplicar(u, p, c, m, uuidPropuesta)).rejects.toBeInstanceOf(ForbiddenException);
    expect(aplicar).not.toHaveBeenCalled();
    exigir.mockResolvedValue(undefined);
    const resultado = await servicio.aplicar(u, p, c, m, uuidPropuesta);
    expect(resultado.modelo.version).toBe(8);
    expect(aplicar).toHaveBeenCalledWith(u, p, m, c, uuidPropuesta);
  });
  it('no aplica desde una conversación archivada ni desde otro proyecto', async () => {
    obtenerConversacion.mockResolvedValue({ estado: 'ARCHIVADA' });
    await expect(servicio.aplicar(u, p, c, m, uuidPropuesta)).rejects.toBeInstanceOf(ConflictException);
    expect(aplicar).not.toHaveBeenCalled();
    obtenerModelo.mockRejectedValue(new ModeloUmlNoEncontradoError());
    await expect(servicio.aplicar(u, p, c, m, uuidPropuesta)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('no inventa una aceptación cuando la propuesta no existe', async () => {
    aplicar.mockResolvedValue(null);
    await expect(servicio.aplicar(u, p, c, m, uuidPropuesta)).rejects.toBeInstanceOf(NotFoundException);
  });
});
