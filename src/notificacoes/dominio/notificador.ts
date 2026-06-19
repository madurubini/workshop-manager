/**
 * Porta para o sistema externo Serviço de Notificações (SE). Avisa o cliente
 * sobre orçamento (inicial e adicional) e retirada do veículo. Como é uma
 * porta, o canal real (app/e-mail/SMS) pode mudar sem afetar o domínio.
 */
export const NOTIFICADOR = Symbol('Notificador');

export type TipoNotificacao =
  | 'ORCAMENTO_ENVIADO'
  | 'ORCAMENTO_APROVADO'
  | 'ORCAMENTO_RECUSADO'
  | 'LEMBRETE_APROVACAO'
  | 'ORCAMENTO_ADICIONAL_ENVIADO'
  | 'LEMBRETE_ORCAMENTO_ADICIONAL'
  | 'VEICULO_PRONTO'
  | 'VEICULO_ENTREGUE';

export interface Notificador {
  notificar(entrada: {
    ordemId: string;
    tipo: TipoNotificacao;
    mensagem: string;
  }): Promise<void>;
}
