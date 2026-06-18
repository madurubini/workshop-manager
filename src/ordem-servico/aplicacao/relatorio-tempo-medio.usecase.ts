import { Inject, Injectable } from '@nestjs/common';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
  PeriodoRelatorio,
} from '../dominio/repositorios';

export interface RelatorioTempoMedio {
  totalOrdens: number;
  tempoMedioMinutos: number | null;
}

/**
 * Caso de uso: tempo médio de execução das OS concluídas (base: do início da
 * execução à conclusão). Opcionalmente filtra por período de conclusão.
 */
@Injectable()
export class RelatorioTempoMedioExecucao {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
  ) {}

  async executar(periodo?: PeriodoRelatorio): Promise<RelatorioTempoMedio> {
    const tempos = await this.ordens.listarTemposExecucao(periodo);
    if (tempos.length === 0) {
      return { totalOrdens: 0, tempoMedioMinutos: null };
    }
    const somaMin = tempos.reduce((soma, t) => {
      const ms = t.finalizadoEm.getTime() - t.iniciadoExecucaoEm.getTime();
      return soma + ms / 60000;
    }, 0);
    return {
      totalOrdens: tempos.length,
      tempoMedioMinutos: Math.round(somaMin / tempos.length),
    };
  }
}
