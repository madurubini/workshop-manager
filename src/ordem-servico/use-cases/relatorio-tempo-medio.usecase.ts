import { Inject, Injectable } from '@nestjs/common';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
  PeriodoRelatorio,
} from './ordem-servico.repositorio';

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
 * Tempo do início da execução à conclusão. Na quebra por serviço, o tempo
 * total da OS é creditado a cada serviço dela: `tempoMedioMinutos` é a média
 * das OS que contêm aquele serviço, não o tempo isolado dele.
 */
@Injectable()
export class RelatorioTempoMedioExecucao {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
  ) {}

  async executar(periodo?: PeriodoRelatorio): Promise<RelatorioTempoMedio> {
    this.validarPeriodo(periodo);
    const tempos = await this.ordens.listarTemposExecucao(periodo);
    if (tempos.length === 0) {
      return { totalOrdens: 0, tempoMedioMinutos: null, porServico: [] };
    }

    const minutos = (t: { iniciadoExecucaoEm: Date; finalizadoEm: Date }) =>
      (t.finalizadoEm.getTime() - t.iniciadoExecucaoEm.getTime()) / 60000;

    const somaMin = tempos.reduce((soma, t) => soma + minutos(t), 0);

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

  /** Coerência entre os dois campos: nenhum deles sozinho a garante no DTO. */
  private validarPeriodo(periodo?: PeriodoRelatorio): void {
    const { inicio, fim } = periodo ?? {};
    if (inicio && fim && inicio.getTime() > fim.getTime()) {
      throw new ErroValidacao('O início do período é posterior ao fim.', {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      });
    }
  }
}
