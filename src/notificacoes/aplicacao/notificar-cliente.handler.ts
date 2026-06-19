import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Importações SÓ DE TIPO: contratos dos eventos, sem acoplar ao módulo de OS.
import type {
  ExecucaoConcluida,
  OrcamentoAprovado,
  OrcamentoEnviado,
  OrcamentoRecusado,
  VeiculoEntregue,
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
    const adicional = (evento.tipo as string) === 'ADICIONAL';
    await this.notificador.notificar({
      ordemId: evento.ordemId,
      tipo: adicional ? 'ORCAMENTO_ADICIONAL_ENVIADO' : 'ORCAMENTO_ENVIADO',
      mensagem: adicional
        ? `Identificamos um reparo adicional na OS ${evento.numero}. Autorize ou recuse pelo aplicativo.`
        : `Seu orçamento da OS ${evento.numero} está pronto. Aprove ou recuse pelo aplicativo.`,
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
