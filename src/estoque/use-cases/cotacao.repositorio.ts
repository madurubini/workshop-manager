export interface DadosCotacao {
  ordemId: string;
  pecaId: string;
  preco: number;
  prazoDias: number;
  fornecedor: string | null;
}

export const COTACAO_REPOSITORY = Symbol('CotacaoRepository');

export interface CotacaoRepository {
  registrar(dados: DadosCotacao): Promise<void>;
}
