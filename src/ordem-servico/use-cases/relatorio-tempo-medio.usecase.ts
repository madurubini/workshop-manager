import { Inject, Injectable } from '@nestjs/common';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
  PeriodoRelatorio,
} from './ordem-servico.repositorio';

/** Tempo médio das OS que contêm um determinado tipo de serviço. */
export interface TempoMedioPorServico {
  servicoId: string;
  servicoNome: string;
  totalOrdens: number;
  tempoMedioMinutos: number;
}

export interface RelatorioTempoMedio {
  totalOrdens: number;
  tempoMedioMinutos: number | null;
  porServico: TempoMedioPorServico[];
}

/**
 * Caso de uso: tempo médio de execução das OS concluídas (base: do início da
 * execução à conclusão). Opcionalmente filtra por período de conclusão.
 *
 * Quebra por TIPO DE SERVIÇO (abordagem por OS): o tempo total de cada OS é
 * creditado a cada serviço executado nela. Logo, `tempoMedioMinutos` de um
 * serviço é a média do tempo das OS que o contêm — não o tempo isolado daquele
 * serviço (que exigiria cronometrar serviço a serviço).
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
      return { totalOrdens: 0, tempoMedioMinutos: null, porServico: [] };
    }

    const minutos = (t: { iniciadoExecucaoEm: Date; finalizadoEm: Date }) =>
      (t.finalizadoEm.getTime() - t.iniciadoExecucaoEm.getTime()) / 60000;

    const somaMin = tempos.reduce((soma, t) => soma + minutos(t), 0);

    // Agrega por serviço: cada OS contribui com seu tempo para cada serviço dela.
    const porServico = new Map<
      string,
      { nome: string; soma: number; ordens: number }
    >();
    for (const t of tempos) {
      const m = minutos(t);
      for (const s of t.servicos) {
        const acc = porServico.get(s.id) ?? {
          nome: s.nome,
          soma: 0,
          ordens: 0,
        };
        acc.soma += m;
        acc.ordens += 1;
        porServico.set(s.id, acc);
      }
    }

    return {
      totalOrdens: tempos.length,
      tempoMedioMinutos: Math.round(somaMin / tempos.length),
      porServico: [...porServico]
        .map(([servicoId, v]) => ({
          servicoId,
          servicoNome: v.nome,
          totalOrdens: v.ordens,
          tempoMedioMinutos: Math.round(v.soma / v.ordens),
        }))
        .sort((a, b) => a.servicoNome.localeCompare(b.servicoNome)),
    };
  }
}
