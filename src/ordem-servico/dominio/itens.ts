/**
 * Entidades internas da OS: itens de serviço/peça e o orçamento. Não são
 * agregados separados — vivem dentro da Ordem de Serviço. O preço é SEMPRE
 * congelado (precoAplicado) no momento do diagnóstico, conforme a decisão de
 * negócio: o orçamento não puxa o preço do catálogo/estoque na hora de exibir.
 */

export enum SituacaoItemPeca {
  PENDENTE = 'PENDENTE',
  DISPONIVEL = 'DISPONIVEL',
  EM_COTACAO = 'EM_COTACAO',
  ENCOMENDADA = 'ENCOMENDADA',
  RESERVADA = 'RESERVADA',
}

export interface ItemServico {
  id: string;
  servicoId: string;
  descricao: string; // snapshot do nome
  quantidade: number;
  precoAplicado: number; // congelado
  reparoId: string | null;
}

export interface ItemPeca {
  id: string;
  pecaId: string;
  descricao: string; // snapshot do nome
  quantidade: number;
  precoAplicado: number; // congelado
  situacao: SituacaoItemPeca;
  reparoId: string | null;
}

export enum StatusOrcamento {
  GERADO = 'GERADO',
  ENVIADO = 'ENVIADO',
  APROVADO = 'APROVADO',
  RECUSADO = 'RECUSADO',
}

export interface Orcamento {
  id: string;
  totalServicos: number;
  totalPecas: number;
  total: number;
  status: StatusOrcamento;
  enviadoEm: Date | null;
  respondidoEm: Date | null;
}

/** Arredonda para 2 casas (dinheiro), evitando ruído de ponto flutuante. */
export function arredondar2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
