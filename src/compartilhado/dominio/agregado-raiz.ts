import { EntidadeBase } from './entidade-base';
import { EventoDominio } from './evento-dominio';

/**
 * Raiz de agregado: a única entidade do agregado que o mundo externo
 * referencia e por onde passam as invariantes. Além de ter identidade,
 * acumula os eventos de domínio gerados durante uma operação.
 *
 * Fluxo: o caso de uso executa o comando (a raiz registra eventos via
 * `registrarEvento`), persiste o agregado e então `puxarEventos()` para
 * entregá-los ao event bus — publicação só após o sucesso da operação.
 */
export abstract class AgregadoRaiz<TId> extends EntidadeBase<TId> {
  private readonly _eventos: EventoDominio[] = [];

  /** Eventos ainda não publicados. */
  get eventos(): readonly EventoDominio[] {
    return this._eventos;
  }

  protected registrarEvento(evento: EventoDominio): void {
    this._eventos.push(evento);
  }

  /** Devolve os eventos pendentes e limpa a fila interna. */
  puxarEventos(): EventoDominio[] {
    const pendentes = [...this._eventos];
    this._eventos.length = 0;
    return pendentes;
  }
}
