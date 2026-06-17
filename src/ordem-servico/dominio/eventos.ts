import { EventoDominio } from '../../compartilhado/dominio/evento-dominio';
import { StatusOS } from './status-os';

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

/** Diagnóstico concluído (serviços e peças registrados). */
export class DiagnosticoConcluido extends EventoDominio {
  constructor(readonly ordemId: string) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.diagnostico-concluido';
  }
}

/** Orçamento gerado a partir do diagnóstico (ainda não enviado). */
export class OrcamentoGerado extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly orcamentoId: string,
    readonly total: number,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'ordem-servico.orcamento-gerado';
  }
}
