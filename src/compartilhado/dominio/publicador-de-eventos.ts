import { EventoDominio } from './evento-dominio';

/**
 * Porta do event bus. Os casos de uso dependem desta abstração para publicar
 * eventos de domínio sem conhecer o mecanismo de entrega (in-process,
 * @nestjs/event-emitter). Assim mantemos os módulos desacoplados: quem publica
 * não conhece quem assina.
 */
export const PUBLICADOR_DE_EVENTOS = Symbol('PublicadorDeEventos');

export interface PublicadorDeEventos {
  /** Publica um ou mais eventos já ocorridos (após o sucesso da operação). */
  publicar(...eventos: EventoDominio[]): void;
}
