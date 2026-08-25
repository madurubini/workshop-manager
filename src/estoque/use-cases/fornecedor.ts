/**
 * Porta para o sistema externo Fornecedor (SE). Recebe pedidos de cotação e,
 * mais adiante (Fase 5), de encomenda de peças. Cotação ≠ compra: aqui só se
 * pede preço e prazo para uma peça indisponível.
 */
export const FORNECEDOR = Symbol('Fornecedor');

export interface CotacaoFornecedor {
  preco: number;
  prazoDias: number;
  fornecedor: string;
}

export interface Fornecedor {
  cotar(entrada: {
    pecaId: string;
    quantidade: number;
    precoReferencia: number;
  }): Promise<CotacaoFornecedor>;

  encomendar(entrada: {
    ordemId: string;
    pecaId: string;
    quantidade: number;
  }): Promise<void>;
}
