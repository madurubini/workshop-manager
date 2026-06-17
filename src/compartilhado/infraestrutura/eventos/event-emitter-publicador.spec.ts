import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventoDominio } from '../../dominio/evento-dominio';
import { EventEmitterPublicador } from './event-emitter-publicador';

class OrcamentoAprovado extends EventoDominio {
  constructor(readonly ordemId: string) {
    super();
  }
  get nomeEvento(): string {
    return 'orcamento.aprovado';
  }
}

describe('EventEmitterPublicador', () => {
  it('emite cada evento no tópico do seu nomeEvento e entrega aos assinantes', () => {
    const emitter = new EventEmitter2();
    const publicador = new EventEmitterPublicador(emitter);
    const recebidos: EventoDominio[] = [];

    emitter.on('orcamento.aprovado', (evento: EventoDominio) =>
      recebidos.push(evento),
    );

    publicador.publicar(new OrcamentoAprovado('os-1'));

    expect(recebidos).toHaveLength(1);
    expect((recebidos[0] as OrcamentoAprovado).ordemId).toBe('os-1');
  });

  it('publica múltiplos eventos numa só chamada', () => {
    const emitter = new EventEmitter2();
    const publicador = new EventEmitterPublicador(emitter);
    const espia = jest.fn();
    emitter.on('orcamento.aprovado', espia);

    publicador.publicar(
      new OrcamentoAprovado('os-1'),
      new OrcamentoAprovado('os-2'),
    );

    expect(espia).toHaveBeenCalledTimes(2);
  });
});
