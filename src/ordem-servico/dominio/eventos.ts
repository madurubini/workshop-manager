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
