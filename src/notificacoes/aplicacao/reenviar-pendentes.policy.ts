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

    const reparos = await this.consulta.listarReparosAguardando();
    for (const r of reparos) {
      await this.notificador.notificar({
        ordemId: r.ordemId,
        tipo: 'LEMBRETE_REPARO',
        mensagem: `Lembrete: o reparo adicional da OS ${r.numero} aguarda sua autorização.`,
      });
    }

    const total = orcamentos.length + reparos.length;
    if (total > 0) {
      this.logger.log(`Reenviado lembrete para ${total} pendência(s).`);
    }
  }
}
