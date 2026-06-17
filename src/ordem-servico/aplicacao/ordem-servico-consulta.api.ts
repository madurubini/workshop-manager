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

export interface ReparoAguardando {
  ordemId: string;
  numero: string;
  reparoId: string;
}

export interface OrdemServicoConsultaApi {
  /** OS no estado "Aguardando aprovação" (cliente ainda não respondeu). */
  listarAguardandoResposta(): Promise<OrdemAguardando[]>;
  /** Reparos adicionais aguardando autorização do cliente. */
  listarReparosAguardando(): Promise<ReparoAguardando[]>;
}
