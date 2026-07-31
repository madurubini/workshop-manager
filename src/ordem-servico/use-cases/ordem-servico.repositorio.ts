import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';

export const ORDEM_SERVICO_REPOSITORY = Symbol('OrdemServicoRepository');

export interface FiltroOrdens {
  status?: StatusOS;
  clienteId?: string;
}

export interface PeriodoRelatorio {
  inicio?: Date;
  fim?: Date;
}

/** Serviço (do catálogo) efetivamente executado numa OS. */
export interface ServicoExecutado {
  id: string;
  nome: string;
}

export interface TempoExecucao {
  iniciadoExecucaoEm: Date;
  finalizadoEm: Date;
  /** Serviços distintos dos orçamentos APROVADOS — base do tempo por tipo. */
  servicos: ServicoExecutado[];
}

export interface OrdemServicoRepository {
  inserir(ordem: OrdemServico): Promise<void>;
  /**
   * Persiste uma OS já existente com optimistic lock: usa a versão carregada
   * para detectar escrita concorrente. Lança ErroConflito se a versão mudou.
   */
  atualizar(ordem: OrdemServico): Promise<void>;
  buscarPorId(id: string): Promise<OrdemServico | null>;
  listar(filtro?: FiltroOrdens): Promise<OrdemServico[]>;
  /** Gera o próximo número sequencial da OS (ex.: OS-000001). */
  proximoNumero(): Promise<string>;
  /** OS com execução concluída (tempos), para o relatório de tempo médio. */
  listarTemposExecucao(periodo?: PeriodoRelatorio): Promise<TempoExecucao[]>;
}
