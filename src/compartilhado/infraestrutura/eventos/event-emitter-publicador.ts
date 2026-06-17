import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventoDominio } from '../../dominio/evento-dominio';
import { PublicadorDeEventos } from '../../dominio/publicador-de-eventos';

/**
 * Adaptador in-process da porta PublicadorDeEventos sobre o EventEmitter2.
 * Cada evento é emitido no tópico `evento.nomeEvento`; os assinantes de outros
 * módulos reagem com `@OnEvent(nome)`. Por ser in-process, publicar é uma
 * chamada de função — sem rede, sem broker.
 */
@Injectable()
export class EventEmitterPublicador implements PublicadorDeEventos {
  private readonly logger = new Logger(EventEmitterPublicador.name);

  constructor(private readonly emitter: EventEmitter2) {}

  async publicar(...eventos: EventoDominio[]): Promise<void> {
    for (const evento of eventos) {
      this.logger.debug(`Publicando evento "${evento.nomeEvento}"`);
      // emitAsync aguarda os assinantes (inclusive os assíncronos).
      await this.emitter.emitAsync(evento.nomeEvento, evento);
    }
  }
}
