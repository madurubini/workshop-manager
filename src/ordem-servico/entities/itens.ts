/**
 * Entidades internas da OS: as linhas orçadas (serviço/peça) e o orçamento.
 * Não são agregados separados — vivem dentro da Ordem de Serviço. O preço é
 * SEMPRE congelado (precoAplicado) no momento do diagnóstico/lançamento,
 * conforme a decisão de negócio: o orçamento não puxa o preço do catálogo/
 * estoque na hora de exibir — ele vale o que foi acordado.
 *
 * Uma OS tem VÁRIOS orçamentos: um INICIAL (do diagnóstico) e zero ou mais
 * ADICIONAL (reparos descobertos durante a execução). Cada orçamento carrega
 * suas próprias linhas e é aprovado/recusado de forma independente.
 */

export enum SituacaoPecaOrcada {
  PENDENTE = 'PENDENTE',
  DISPONIVEL = 'DISPONIVEL',
  EM_COTACAO = 'EM_COTACAO',
  ENCOMENDADA = 'ENCOMENDADA',
  RESERVADA = 'RESERVADA',
}

/** Linha de serviço do orçamento (snapshot do catálogo, preço congelado). */
export interface ServicoOrcado {
  id: string;
  servicoId: string;
  descricao: string; // snapshot do nome
  quantidade: number;
  precoAplicado: number; // congelado
}

/** Linha de peça do orçamento (snapshot do estoque, preço congelado). */
export interface PecaOrcada {
  id: string;
  pecaId: string;
  descricao: string; // snapshot do nome
  quantidade: number;
  precoAplicado: number; // congelado
  situacao: SituacaoPecaOrcada;
}

export enum TipoOrcamento {
  INICIAL = 'INICIAL',
  ADICIONAL = 'ADICIONAL',
}

export enum StatusOrcamento {
  GERADO = 'GERADO',
  ENVIADO = 'ENVIADO',
  APROVADO = 'APROVADO',
  RECUSADO = 'RECUSADO',
}

/**
 * Orçamento da OS. O INICIAL nasce no diagnóstico; os ADICIONAL nascem na
 * execução (o antigo "reparo adicional") já enviados, aguardando o cliente.
 */
export interface Orcamento {
  id: string;
  tipo: TipoOrcamento;
  descricao: string | null; // motivo, nos adicionais
  totalServicos: number;
  totalPecas: number;
  total: number;
  status: StatusOrcamento;
  criadoEm: Date;
  enviadoEm: Date | null;
  respondidoEm: Date | null;
  servicos: ServicoOrcado[];
  pecas: PecaOrcada[];
}

/** Arredonda para 2 casas (dinheiro), evitando ruído de ponto flutuante. */
export function arredondar2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Recalcula os totais de um orçamento a partir das suas linhas. */
export function calcularTotais(orcamento: Orcamento): void {
  orcamento.totalServicos = arredondar2(
    orcamento.servicos.reduce((s, i) => s + i.precoAplicado * i.quantidade, 0),
  );
  orcamento.totalPecas = arredondar2(
    orcamento.pecas.reduce((s, i) => s + i.precoAplicado * i.quantidade, 0),
  );
  orcamento.total = arredondar2(orcamento.totalServicos + orcamento.totalPecas);
}
