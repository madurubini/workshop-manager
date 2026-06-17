import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Importações SÓ DE TIPO: contratos dos eventos, sem acoplar ao módulo de OS.
import type {
  OrcamentoAprovado,
  OrcamentoEnviado,
  OrcamentoRecusado,
  ReparoAdicionalLancado,
} from '../../ordem-servico/dominio/eventos';
import { NOTIFICADOR, Notificador } from '../dominio/notificador';

/**
 * Assinantes de eventos do contexto de notificações. Demonstra o fan-out do
 * event bus: o evento `orcamento-aprovado` é tratado tanto pelo Estoque
 * (reserva) quanto aqui (aviso ao cliente) — sem um conhecer o outro.
 */
@Injectable()
export class NotificarCliente {
  constructor(
    @Inject(NOTIFICADOR)
    private readonly notificador: Notificador,
  ) {}

  @OnEvent('ordem-servico.orcamento-enviado')
  async aoEnviar(evento: OrcamentoEnviado): Promise<void> {
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'ORCAMENTO_ENVIADO',
      mensagem: `Seu orçamento da OS ${evento.numero} está pronto. Aprove ou recuse pelo aplicativo.`,
    });
  }

  @OnEvent('ordem-servico.orcamento-aprovado')
  async aoAprovar(evento: OrcamentoAprovado): Promise<void> {
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'ORCAMENTO_APROVADO',
      mensagem: 'Orçamento aprovado. Seu veículo entrou em execução.',
    });
  }

  @OnEvent('ordem-servico.orcamento-recusado')
  async aoRecusar(evento: OrcamentoRecusado): Promise<void> {
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'ORCAMENTO_RECUSADO',
      mensagem: 'Orçamento recusado. A OS foi cancelada.',
    });
  }

  @OnEvent('ordem-servico.reparo-adicional-lancado')
  async aoLancarReparo(evento: ReparoAdicionalLancado): Promise<void> {
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'REPARO_LANCADO',
      mensagem:
        'Identificamos um reparo adicional. Autorize ou recuse pelo aplicativo.',
    });
  }
}
