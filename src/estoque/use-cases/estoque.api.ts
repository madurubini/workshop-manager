/** Porta pública do Estoque, usada pelo diagnóstico. */
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
