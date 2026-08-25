import { EntidadeBase } from './entidade-base';
import { EventoDominio } from './evento-dominio';

/**
 * O caso de uso executa o comando, persiste o agregado e só então chama
 * `puxarEventos()` — os eventos são publicados após o sucesso da operação.
 */
export abstract class AgregadoRaiz<TId> extends EntidadeBase<TId> {
  private readonly _eventos: EventoDominio[] = [];

  get eventos(): readonly EventoDominio[] {
    return this._eventos;
  }

  protected registrarEvento(evento: EventoDominio): void {
    this._eventos.push(evento);
  }

  /** Devolve os pendentes e esvazia a fila. */
  puxarEventos(): EventoDominio[] {
    const pendentes = [...this._eventos];
    this._eventos.length = 0;
    return pendentes;
  }
}
