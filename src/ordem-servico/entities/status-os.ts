/**
 * Máquina de estados da OS:
 *   Recebida → Em diagnóstico → Aguardando aprovação → [Aguardando peça] →
 *   Em execução → Finalizada → Entregue
 * "Aguardando peça" é um desvio opcional: a execução só começa quando as peças
 * encomendadas chegam. Qualquer estado vivo pode ir para Cancelada.
 */
export enum StatusOS {
  RECEBIDA = 'RECEBIDA',
  EM_DIAGNOSTICO = 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO = 'AGUARDANDO_APROVACAO',
  AGUARDANDO_PECA = 'AGUARDANDO_PECA',
  EM_EXECUCAO = 'EM_EXECUCAO',
  FINALIZADA = 'FINALIZADA',
  ENTREGUE = 'ENTREGUE',
  CANCELADA = 'CANCELADA',
}

const TRANSICOES: Record<StatusOS, StatusOS[]> = {
  [StatusOS.RECEBIDA]: [StatusOS.EM_DIAGNOSTICO, StatusOS.CANCELADA],
  [StatusOS.EM_DIAGNOSTICO]: [
    StatusOS.AGUARDANDO_APROVACAO,
    StatusOS.CANCELADA,
  ],
  [StatusOS.AGUARDANDO_APROVACAO]: [
    StatusOS.AGUARDANDO_PECA,
    StatusOS.EM_EXECUCAO,
    StatusOS.CANCELADA,
  ],
  [StatusOS.AGUARDANDO_PECA]: [StatusOS.EM_EXECUCAO, StatusOS.CANCELADA],
  [StatusOS.EM_EXECUCAO]: [StatusOS.FINALIZADA, StatusOS.CANCELADA],
  [StatusOS.FINALIZADA]: [StatusOS.ENTREGUE],
  [StatusOS.ENTREGUE]: [],
  [StatusOS.CANCELADA]: [],
};

export function transicaoPermitida(de: StatusOS, para: StatusOS): boolean {
  return TRANSICOES[de].includes(para);
}

/**
 * Ordem de exibição da fila (menor = topo). "Aguardando peça" vai ao fim: é
 * espera passiva pelo fornecedor. Status encerrados não têm prioridade e
 * ficam fora da fila — exclusão lógica, continuam no banco.
 */
export const PRIORIDADE_FILA: Partial<Record<StatusOS, number>> = {
  [StatusOS.EM_EXECUCAO]: 1,
  [StatusOS.AGUARDANDO_APROVACAO]: 2,
  [StatusOS.EM_DIAGNOSTICO]: 3,
  [StatusOS.RECEBIDA]: 4,
  [StatusOS.AGUARDANDO_PECA]: 5,
};

export const STATUS_FILA = Object.keys(PRIORIDADE_FILA) as StatusOS[];

export const ROTULO_STATUS: Record<StatusOS, string> = {
  [StatusOS.RECEBIDA]: 'Recebida',
  [StatusOS.EM_DIAGNOSTICO]: 'Em diagnóstico',
  [StatusOS.AGUARDANDO_APROVACAO]: 'Aguardando aprovação',
  [StatusOS.AGUARDANDO_PECA]: 'Aguardando peça',
  [StatusOS.EM_EXECUCAO]: 'Em execução',
  [StatusOS.FINALIZADA]: 'Finalizada',
  [StatusOS.ENTREGUE]: 'Entregue',
  [StatusOS.CANCELADA]: 'Cancelada',
};
