import { Inject, Injectable } from '@nestjs/common';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from './ordem-servico.repositorio';

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

/** Pagamento não é transição de status: só libera a entrega. */
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
