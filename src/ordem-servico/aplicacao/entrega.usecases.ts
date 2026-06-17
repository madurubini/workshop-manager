import { Inject, Injectable } from '@nestjs/common';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../dominio/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';

async function carregar(
  ordens: OrdemServicoRepository,
  ordemId: string,
): Promise<OrdemServico> {
  const ordem = await ordens.buscarPorId(ordemId);
  if (!ordem) {
    throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', {
      ordemId,
    });
  }
  return ordem;
}

/**
 * Caso de uso: confirmar o pagamento (manual). Marca a flag `pago` na OS,
 * liberando a entrega. Pagamento não é uma transição de status.
 */
@Injectable()
export class ConfirmarPagamento {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: { ordemId: string }): Promise<OrdemServico> {
    const ordem = await carregar(this.ordens, entrada.ordemId);
    ordem.marcarPago();
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}

/**
 * Caso de uso: entregar o veículo e encerrar a OS (→ Entregue). Exige
 * pagamento confirmado; a regra mora no agregado.
 */
@Injectable()
export class EntregarVeiculo {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: {
    ordemId: string;
    por?: string | null;
  }): Promise<OrdemServico> {
    const ordem = await carregar(this.ordens, entrada.ordemId);
    ordem.entregar(entrada.por);
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
