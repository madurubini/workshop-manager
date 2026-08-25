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

export interface ServicoExecutado {
  id: string;
  nome: string;
}

export interface TempoExecucao {
  iniciadoExecucaoEm: Date;
  finalizadoEm: Date;
  servicos: ServicoExecutado[];
}

export interface OrdemServicoRepository {
  inserir(ordem: OrdemServico): Promise<void>;
  /** Optimistic lock pela versão carregada: lança ErroConflito se ela mudou. */
  atualizar(ordem: OrdemServico): Promise<void>;
  buscarPorId(id: string): Promise<OrdemServico | null>;
  listar(filtro?: FiltroOrdens): Promise<OrdemServico[]>;
  /**
   * Só as OS ativas, mais antigas primeiro. A prioridade por status é regra de
   * negócio e fica no caso de uso.
   */
  listarFila(): Promise<OrdemServico[]>;
  proximoNumero(): Promise<string>;
  listarTemposExecucao(periodo?: PeriodoRelatorio): Promise<TempoExecucao[]>;
}
