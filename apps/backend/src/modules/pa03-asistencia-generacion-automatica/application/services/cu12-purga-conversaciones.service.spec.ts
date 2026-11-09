import type { ConfigService } from '@nestjs/config';
import { PurgaConversacionesRepository } from '../ports/purga-conversaciones.repository';
import { Cu12PurgaConversacionesService } from './cu12-purga-conversaciones.service';

describe('CU-12 bloque 12.2.2: programación segura de la purga', () => {
  let purgarLote: jest.Mock;
  let servicio: Cu12PurgaConversacionesService;
  let config: { get: jest.Mock };

  beforeEach(() => {
    purgarLote = jest.fn().mockResolvedValue(0);
    config = { get: jest.fn().mockReturnValue('true') };
    servicio = new Cu12PurgaConversacionesService(
      { purgarLote } as unknown as PurgaConversacionesRepository,
      config as unknown as ConfigService,
    );
  });

  it('no purga elementos nuevos o restaurados: sin vencidos no hay otro lote', async () => {
    await expect(servicio.ejecutarCiclo()).resolves.toBe(0);
    expect(purgarLote).toHaveBeenCalledTimes(1);
    expect(purgarLote).toHaveBeenCalledWith(25);
  });

  it('procesa varias tandas sin superar el límite de cada lote', async () => {
    purgarLote.mockResolvedValueOnce(25).mockResolvedValueOnce(25).mockResolvedValueOnce(3);
    await expect(servicio.ejecutarCiclo()).resolves.toBe(53);
    expect(purgarLote).toHaveBeenCalledTimes(3);
  });

  it('limita el volumen del ciclo para no monopolizar la base de datos', async () => {
    purgarLote.mockResolvedValue(25);
    await expect(servicio.ejecutarCiclo()).resolves.toBe(250);
    expect(purgarLote).toHaveBeenCalledTimes(10);
  });

  it('impide ciclos simultáneos dentro del mismo proceso', async () => {
    let terminar!: (valor: number) => void;
    purgarLote.mockImplementationOnce(() => new Promise<number>((resolver) => { terminar = resolver; }));
    const primero = servicio.ejecutarCiclo();
    await expect(servicio.ejecutarCiclo()).resolves.toBe(0);
    terminar(0);
    await expect(primero).resolves.toBe(0);
    expect(purgarLote).toHaveBeenCalledTimes(1);
  });

  it('después de un error libera la exclusión para el próximo ciclo', async () => {
    purgarLote.mockRejectedValueOnce(new Error('base de datos no disponible'));
    await expect(servicio.ejecutarCiclo()).rejects.toThrow('base de datos');
    await expect(servicio.ejecutarCiclo()).resolves.toBe(0);
    expect(purgarLote).toHaveBeenCalledTimes(2);
  });

  it('puede deshabilitarse explícitamente para mantenimiento', () => {
    config.get.mockReturnValue('false');
    const temporizador = jest.spyOn(global, 'setInterval');
    try {
      servicio.onApplicationBootstrap();
      expect(purgarLote).not.toHaveBeenCalled();
      expect(temporizador).not.toHaveBeenCalled();
    } finally {
      temporizador.mockRestore();
      servicio.onApplicationShutdown();
    }
  });

  it('configuración predeterminada inicia la limpieza y programa revisiones periódicas', async () => {
    config.get.mockReturnValue(undefined);
    const desreferenciar = jest.fn();
    const temporal = { unref: desreferenciar } as unknown as ReturnType<typeof setInterval>;
    const iniciar = jest.spyOn(global, 'setInterval').mockReturnValue(temporal);
    const detener = jest.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
    try {
      servicio.onApplicationBootstrap();
      await Promise.resolve();
      expect(purgarLote).toHaveBeenCalledTimes(1);
      expect(iniciar).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);
      expect(desreferenciar).toHaveBeenCalledTimes(1);
      servicio.onApplicationShutdown();
      expect(detener).toHaveBeenCalledWith(temporal);
    } finally {
      iniciar.mockRestore();
      detener.mockRestore();
    }
  });
});
