import { EventoDominio } from './evento-dominio';

export const PUBLICADOR_DE_EVENTOS = Symbol('PublicadorDeEventos');

export interface PublicadorDeEventos {
  /**
   * AGUARDA os assinantes: um efeito disparado por política (reservar estoque
   * ao aprovar o orçamento) se completa dentro da mesma operação.
   */
  publicar(...eventos: EventoDominio[]): Promise<void>;
}
