import { Module } from '@nestjs/common';
import { OrdemServicoModule } from '../ordem-servico/ordem-servico.module';
import { NotificarCliente } from './aplicacao/notificar-cliente.handler';
import { ReenviarPendentes } from './aplicacao/reenviar-pendentes.policy';
import { NOTIFICADOR } from './dominio/notificador';
import { NotificadorSimulado } from './infraestrutura/notificador-simulado';

/**
 * Contexto Notificações. Adapta o Serviço de Notificações externo: escuta
 * eventos do Ordem de Serviço (orçamento enviado/aprovado/recusado) e reenvia
 * lembretes às OS sem resposta. Importa OrdemServicoModule só pela porta pública
 * de consulta — não conhece suas entidades.
 */
@Module({
  imports: [OrdemServicoModule],
  providers: [
    { provide: NOTIFICADOR, useClass: NotificadorSimulado },
    NotificarCliente,
    ReenviarPendentes,
  ],
})
export class NotificacoesModule {}
