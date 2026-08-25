/**
 * Linhas orçadas e orçamento — entidades internas da OS, não agregados
 * separados. O `precoAplicado` é congelado no lançamento: o orçamento vale o
 * que foi acordado, não o preço atual do catálogo.
 */

export enum SituacaoPecaOrcada {
  PENDENTE = 'PENDENTE',
  DISPONIVEL = 'DISPONIVEL',
  EM_COTACAO = 'EM_COTACAO',
  ENCOMENDADA = 'ENCOMENDADA',
  RESERVADA = 'RESERVADA',
}

export interface ServicoOrcado {
  id: string;
  servicoId: string;
  descricao: string; // snapshot do nome
  quantidade: number;
  precoAplicado: number; // congelado
}

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

/** O INICIAL nasce no diagnóstico; os ADICIONAL, na execução, já enviados. */
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

/** Arredonda para 2 casas, evitando ruído de ponto flutuante. */
export function arredondar2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularTotais(orcamento: Orcamento): void {
  orcamento.totalServicos = arredondar2(
    orcamento.servicos.reduce((s, i) => s + i.precoAplicado * i.quantidade, 0),
  );
  orcamento.totalPecas = arredondar2(
    orcamento.pecas.reduce((s, i) => s + i.precoAplicado * i.quantidade, 0),
  );
  orcamento.total = arredondar2(orcamento.totalServicos + orcamento.totalPecas);
}
