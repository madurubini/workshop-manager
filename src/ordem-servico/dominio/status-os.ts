/**
 * Status da OS (value object) e a máquina de estados do agregado.
 *
 * A ordem válida (linguagem ubíqua):
 *   Recebida → Em diagnóstico → Aguardando aprovação → Em execução
 *            → Finalizada → Entregue
 * Qualquer estado "vivo" pode ir para Cancelada. Transições fora desse mapa
 * são rejeitadas (no contrato, viram HTTP 422).
 */
export enum StatusOS {
  RECEBIDA = 'RECEBIDA',
  EM_DIAGNOSTICO = 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO = 'AGUARDANDO_APROVACAO',
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
  [StatusOS.AGUARDANDO_APROVACAO]: [StatusOS.EM_EXECUCAO, StatusOS.CANCELADA],
  [StatusOS.EM_EXECUCAO]: [StatusOS.FINALIZADA, StatusOS.CANCELADA],
  [StatusOS.FINALIZADA]: [StatusOS.ENTREGUE],
  [StatusOS.ENTREGUE]: [],
  [StatusOS.CANCELADA]: [],
};

export function transicaoPermitida(de: StatusOS, para: StatusOS): boolean {
  return TRANSICOES[de].includes(para);
}

/** Rótulos de exibição (como no contrato/linguagem ubíqua). */
export const ROTULO_STATUS: Record<StatusOS, string> = {
  [StatusOS.RECEBIDA]: 'Recebida',
  [StatusOS.EM_DIAGNOSTICO]: 'Em diagnóstico',
  [StatusOS.AGUARDANDO_APROVACAO]: 'Aguardando aprovação',
  [StatusOS.EM_EXECUCAO]: 'Em execução',
  [StatusOS.FINALIZADA]: 'Finalizada',
  [StatusOS.ENTREGUE]: 'Entregue',
  [StatusOS.CANCELADA]: 'Cancelada',
};
