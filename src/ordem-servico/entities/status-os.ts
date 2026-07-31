/**
 * Status da OS (value object) e a máquina de estados do agregado.
 *
 * A ordem válida (linguagem ubíqua):
 *   Recebida → Em diagnóstico → Aguardando aprovação → [Aguardando peça] →
 *   Em execução → Finalizada → Entregue
 * "Aguardando peça" é um desvio opcional após a aprovação: a OS só entra em
 * execução quando todas as peças encomendadas chegam ao estoque. Qualquer
 * estado "vivo" pode ir para Cancelada. Transições fora desse mapa são
 * rejeitadas (no contrato, viram HTTP 422).
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

/** Para cada estado, os estados de destino permitidos. */
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
 * Fila de trabalho da oficina: prioridade de exibição por status (menor número
 * = mais no topo). Segue o enunciado — Em execução > Aguardando aprovação >
 * Em diagnóstico > Recebida — e coloca "Aguardando peça" (espera passiva pelo
 * fornecedor, sem ação imediata da oficina) ao fim. Os status encerrados
 * (Finalizada, Entregue, Cancelada) não têm prioridade: ficam FORA da fila
 * (exclusão lógica — continuam no banco, só não aparecem na listagem).
 */
export const PRIORIDADE_FILA: Partial<Record<StatusOS, number>> = {
  [StatusOS.EM_EXECUCAO]: 1,
  [StatusOS.AGUARDANDO_APROVACAO]: 2,
  [StatusOS.EM_DIAGNOSTICO]: 3,
  [StatusOS.RECEBIDA]: 4,
  [StatusOS.AGUARDANDO_PECA]: 5,
};

/** Status que compõem a fila de trabalho (os que têm prioridade definida). */
export const STATUS_FILA = Object.keys(PRIORIDADE_FILA) as StatusOS[];

/** Rótulos de exibição (como no contrato/linguagem ubíqua). */
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
