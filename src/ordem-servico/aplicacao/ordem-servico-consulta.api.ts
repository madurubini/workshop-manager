/**
 * Porta pública de consulta do Ordem de Serviço. Usada por outros contextos
 * (ex.: notificacoes) que precisam saber, de forma síncrona, quais OS aguardam
 * resposta do cliente — sem alcançar o repositório interno.
 */
export const ORDEM_SERVICO_CONSULTA = Symbol('OrdemServicoConsultaApi');

export interface OrdemAguardando {
  ordemId: string;
  numero: string;
}

export interface OrcamentoAdicionalAguardando {
  ordemId: string;
  numero: string;
  orcamentoId: string;
}

export interface OrdemServicoConsultaApi {
  /** OS no estado "Aguardando aprovação" (cliente ainda não respondeu). */
  listarAguardandoResposta(): Promise<OrdemAguardando[]>;
  /** Orçamentos adicionais aguardando autorização do cliente. */
  listarOrcamentosAdicionaisAguardando(): Promise<
    OrcamentoAdicionalAguardando[]
  >;
}
