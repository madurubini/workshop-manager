import { EventoDominio } from '../../compartilhado/dominio/evento-dominio';
import type { TipoOrcamento } from './itens';
import { StatusOS } from './status-os';

/**
 * Item de peça no momento da aprovação, com a situação ORIGINAL do diagnóstico
 * — é o que o Estoque usa para decidir entre reservar (DISPONIVEL) e encomendar
 * (EM_COTACAO). É um contrato público (string simples), para o Estoque não
 * depender do enum interno do Ordem de Serviço.
 */
export type SituacaoPecaNoOrcamento = 'DISPONIVEL' | 'EM_COTACAO';

export interface ItemPecaAprovado {
  pecaId: string;
  quantidade: number;
  situacao: SituacaoPecaNoOrcamento;
}

/** OS aberta (EV "OS aberta"). */
export class OSAberta extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly numero: string,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.os-aberta';
  }
}

/** Status da OS mudou (gravado também em historico_status). */
export class StatusOSAlterado extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly de: StatusOS,
    readonly para: StatusOS,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.status-alterado';
  }
}

/** OS cancelada (→ estoque cancela encomendas pendentes da OS). */
export class OSCancelada extends EventoDominio {
  constructor(readonly ordemId: string) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.os-cancelada';
  }
}

/** Diagnóstico concluído (serviços e peças registrados). */
export class DiagnosticoConcluido extends EventoDominio {
  constructor(readonly ordemId: string) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.diagnostico-concluido';
  }
}

/** Orçamento gerado (inicial no diagnóstico, ou adicional na execução). */
export class OrcamentoGerado extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly orcamentoId: string,
    readonly tipo: TipoOrcamento,
    readonly total: number,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.orcamento-gerado';
  }
}

/** Orçamento enviado ao cliente (→ notificacoes avisa/pede autorização). */
export class OrcamentoEnviado extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly numero: string,
    readonly orcamentoId: string,
    readonly tipo: TipoOrcamento,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.orcamento-enviado';
  }
}

/**
 * Orçamento aprovado pelo cliente (→ estoque reserva disponíveis e encomenda
 * faltantes). Carrega as peças do orçamento com a situação do diagnóstico.
 */
export class OrcamentoAprovado extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly orcamentoId: string,
    readonly tipo: TipoOrcamento,
    readonly itensPeca: ItemPecaAprovado[],
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.orcamento-aprovado';
  }
}

/**
 * Orçamento recusado pelo cliente. Se for o INICIAL → OS cancelada; se for
 * ADICIONAL → segue só com o que foi aprovado (notificacoes avisa conforme o tipo).
 */
export class OrcamentoRecusado extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly orcamentoId: string,
    readonly tipo: TipoOrcamento,
    readonly justificativa: string | null,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.orcamento-recusado';
  }
}

/** Execução concluída (→ estoque baixa as peças reservadas). */
export class ExecucaoConcluida extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly tempoExecucaoMin: number | null,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.execucao-concluida';
  }
}

/** Pagamento confirmado manualmente (libera a entrega). */
export class PagamentoConfirmado extends EventoDominio {
  constructor(readonly ordemId: string) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.pagamento-confirmado';
  }
}

/** Veículo entregue e OS encerrada. */
export class VeiculoEntregue extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly numero: string,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.veiculo-entregue';
  }
}
