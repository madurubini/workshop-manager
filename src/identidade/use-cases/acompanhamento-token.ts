export const ACOMPANHAMENTO_TOKEN = Symbol('AcompanhamentoToken');

/**
 * Token de acompanhamento: assinado, com ESCOPO de uma OS e validade. Não
 * representa um usuário — representa o direito de responder ao orçamento DAQUELA
 * OS. Vai no link enviado ao cliente; o cliente aprova/recusa sem ter conta.
 */
export interface AcompanhamentoToken {
  gerar(osId: string): Promise<string>;
  /** Valida o token; devolve o osId, ou null se inválido/expirado/fora de escopo. */
  verificar(token: string): Promise<{ osId: string } | null>;
}
