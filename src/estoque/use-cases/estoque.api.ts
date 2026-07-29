/**
 * Porta pública do Estoque (open-host service). Dois serviços usados pelo
 * diagnóstico:
 *  - verificarDisponibilidade: SOMENTE LEITURA. Não reserva nada — só informa
 *    o que há disponível para montar o orçamento.
 *  - solicitarCotacao: para peça em falta, pede preço/prazo ao fornecedor e
 *    registra a cotação (cotação ≠ compra).
 */
export const ESTOQUE_API = Symbol('EstoqueApi');

export interface DisponibilidadePeca {
  pecaId: string;
  encontrada: boolean;
  nome: string;
  precoUnitario: number;
  disponivel: number;
  suficiente: boolean;
}

export interface ResultadoCotacao {
  preco: number;
  prazoDias: number;
  fornecedor: string;
}

export interface EstoqueApi {
  verificarDisponibilidade(
    itens: { pecaId: string; quantidade: number }[],
  ): Promise<DisponibilidadePeca[]>;

  solicitarCotacao(
    ordemId: string,
    pecaId: string,
    quantidade: number,
  ): Promise<ResultadoCotacao>;
}
