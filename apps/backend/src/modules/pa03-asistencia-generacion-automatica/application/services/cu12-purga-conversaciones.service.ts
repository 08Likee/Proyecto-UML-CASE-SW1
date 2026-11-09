import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PurgaConversacionesRepository } from '../ports/purga-conversaciones.repository';

const INTERVALO_PURGA_MS = 60 * 60 * 1000;
const TAMANO_LOTE = 25;
const MAXIMO_LOTES_POR_CICLO = 10;

/**
 * Limpieza en el backend, sin endpoints destructivos para usuarios.
 * En arranque y cada hora procesa hasta 250 conversaciones vencidas por ciclo.
 */
@Injectable()
export class Cu12PurgaConversacionesService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(Cu12PurgaConversacionesService.name);
  private intervalo?: ReturnType<typeof setInterval>;
  private ejecutando = false;

  constructor(
    private readonly repositorio: PurgaConversacionesRepository,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('CU12_PURGA_AUTOMATICA')?.trim().toLowerCase() === 'false') {
      this.logger.warn('Purga automática CU-12 desactivada por configuración');
      return;
    }
    this.intervalo = setInterval(() => this.iniciarCiclo(), INTERVALO_PURGA_MS);
    this.intervalo.unref?.();
    this.iniciarCiclo();
  }

  onApplicationShutdown(): void {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = undefined;
  }

  /** Puede probarse sin iniciar servidores ni esperar temporizadores reales. */
  async ejecutarCiclo(): Promise<number> {
    if (this.ejecutando) return 0;
    this.ejecutando = true;
    let total = 0;
    try {
      for (let lote = 0; lote < MAXIMO_LOTES_POR_CICLO; lote += 1) {
        const purgadas = await this.repositorio.purgarLote(TAMANO_LOTE);
        total += purgadas;
        if (purgadas < TAMANO_LOTE) break;
      }
      if (total > 0) {
        this.logger.log(`CU-12: ${total} conversaciones vencidas purgadas`);
      }
      return total;
    } finally {
      this.ejecutando = false;
    }
  }

  private iniciarCiclo(): void {
    void this.ejecutarCiclo().catch((error: unknown) => {
      const detalle = error instanceof Error ? error.stack : String(error);
      this.logger.error('CU-12: falló la purga; se reintentará en el próximo ciclo', detalle);
    });
  }
}
