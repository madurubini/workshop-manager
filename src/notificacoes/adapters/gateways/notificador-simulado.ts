import { Injectable, Logger } from '@nestjs/common';
import { Notificador, TipoNotificacao } from '../../use-cases/notificador';

/**
 * Adaptador simulado do Serviço de Notificações (MVP): registra no log o aviso
 * que seria enviado ao cliente. Em produção, integraria com app/e-mail/SMS.
 */
@Injectable()
export class NotificadorSimulado implements Notificador {
  private readonly logger = new Logger('Notificacoes');

  async notificar(entrada: {
    ordemId: string;
    tipo: TipoNotificacao;
    mensagem: string;
  }): Promise<void> {
    this.logger.log(
      `[${entrada.tipo}] OS ${entrada.ordemId}: ${entrada.mensagem}`,
    );
  }
}
