import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ORDEM_SERVICO_CONSULTA,
  OrdemServicoConsultaApi,
} from '../../ordem-servico/aplicacao/ordem-servico-consulta.api';
import { NOTIFICADOR, Notificador } from '../dominio/notificador';

/**
 * Política "cliente sem resposta": enquanto houver OS aguardando aprovação, o
 * Sistema reenvia a notificação periodicamente. NÃO expira nem cancela sozinho
 * — apenas lembra o cliente. Consulta as pendências pela porta pública do OS.
 */
@Injectable()
export class ReenviarPendentes {
  private readonly logger = new Logger(ReenviarPendentes.name);

  constructor(
    @Inject(ORDEM_SERVICO_CONSULTA)
    private readonly consulta: OrdemServicoConsultaApi,
    @Inject(NOTIFICADOR)
    private readonly notificador: Notificador,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async reenviar(): Promise<void> {
    const orcamentos = await this.consulta.listarAguardandoResposta();
    for (const os of orcamentos) {
      await this.notificador.notificar({
        ordemId: os.ordemId,
        tipo: 'LEMBRETE_APROVACAO',
        mensagem: `Lembrete: o orçamento da OS ${os.numero} aguarda sua aprovação.`,
      });
    }

    const adicionais =
      await this.consulta.listarOrcamentosAdicionaisAguardando();
    for (const a of adicionais) {
      await this.notificador.notificar({
        ordemId: a.ordemId,
        tipo: 'LEMBRETE_ORCAMENTO_ADICIONAL',
        mensagem: `Lembrete: o orçamento adicional da OS ${a.numero} aguarda sua autorização.`,
      });
    }

    const total = orcamentos.length + adicionais.length;
    if (total > 0) {
      this.logger.log(`Reenviado lembrete para ${total} pendência(s).`);
    }
  }
}
