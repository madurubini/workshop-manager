import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Só de tipo: os contratos dos eventos, sem acoplar ao módulo de OS.
import type {
  ExecucaoConcluida,
  OrcamentoAprovado,
  OrcamentoEnviado,
  OrcamentoRecusado,
  VeiculoEntregue,
} from '../../ordem-servico/entities/eventos';
import {
  ACOMPANHAMENTO_TOKEN,
  AcompanhamentoToken,
} from '../../identidade/use-cases/acompanhamento-token';
import { NOTIFICADOR, Notificador } from './notificador';

/**
 * Fan-out do event bus: `orcamento-aprovado` é tratado pelo Estoque (reserva)
 * e aqui (aviso ao cliente), sem um conhecer o outro.
 *
 * O link enviado carrega o token de acompanhamento da OS — é por ele que o
 * cliente aprova sem ter conta.
 */
@Injectable()
export class NotificarCliente {
  constructor(
    @Inject(NOTIFICADOR)
    private readonly notificador: Notificador,
    @Inject(ACOMPANHAMENTO_TOKEN)
    private readonly tokens: AcompanhamentoToken,
  ) {}

  @OnEvent('ordem-servico.orcamento-enviado')
  async aoEnviar(evento: OrcamentoEnviado): Promise<void> {
    const adicional = (evento.tipo as string) === 'ADICIONAL';
    const token = await this.tokens.gerar(evento.ordemId);
    const link = `/acompanhamento/${evento.ordemId}?token=${token}`;
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: adicional ? 'ORCAMENTO_ADICIONAL_ENVIADO' : 'ORCAMENTO_ENVIADO',
      mensagem: adicional
        ? `Identificamos um reparo adicional na OS ${evento.numero}. Autorize ou recuse pelo aplicativo: ${link}`
        : `Seu orçamento da OS ${evento.numero} está pronto. Aprove ou recuse pelo aplicativo: ${link}`,
    });
  }

  @OnEvent('ordem-servico.orcamento-aprovado')
  async aoAprovar(evento: OrcamentoAprovado): Promise<void> {
    const adicional = (evento.tipo as string) === 'ADICIONAL';
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'ORCAMENTO_APROVADO',
      mensagem: adicional
        ? 'Reparo adicional aprovado. Vamos executá-lo também.'
        : 'Orçamento aprovado. Seu veículo entrou em execução.',
    });
  }

  @OnEvent('ordem-servico.orcamento-recusado')
  async aoRecusar(evento: OrcamentoRecusado): Promise<void> {
    const adicional = (evento.tipo as string) === 'ADICIONAL';
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'ORCAMENTO_RECUSADO',
      mensagem: adicional
        ? 'Reparo adicional recusado. Seguiremos sem esse serviço.'
        : 'Orçamento recusado. A OS foi cancelada.',
    });
  }

  @OnEvent('ordem-servico.execucao-concluida')
  async aoConcluirExecucao(evento: ExecucaoConcluida): Promise<void> {
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'VEICULO_PRONTO',
      mensagem: 'Seu veículo está pronto. Após o pagamento, pode ser retirado.',
    });
  }

  @OnEvent('ordem-servico.veiculo-entregue')
  async aoEntregar(evento: VeiculoEntregue): Promise<void> {
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: 'VEICULO_ENTREGUE',
      mensagem: `Veículo entregue. OS ${evento.numero} encerrada. Obrigado!`,
    });
  }
}
