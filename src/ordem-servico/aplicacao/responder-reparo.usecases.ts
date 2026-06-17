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
 * Cliente APROVA o reparo adicional. Marca as peças do reparo como
 * reservada/encomendada e publica ReparoAprovado — que o Estoque escuta para
 * reservar/encomendar (mesma política da aprovação do orçamento).
 */
@Injectable()
export class AprovarReparoAdicional {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: {
    ordemId: string;
    reparoId: string;
  }): Promise<OrdemServico> {
    const ordem = await carregar(this.ordens, entrada.ordemId);
    ordem.aprovarReparo(entrada.reparoId);
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}

/** Cliente RECUSA o reparo adicional: remove seus itens e segue só com o aprovado. */
@Injectable()
export class RecusarReparoAdicional {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: {
    ordemId: string;
    reparoId: string;
  }): Promise<OrdemServico> {
    const ordem = await carregar(this.ordens, entrada.ordemId);
    ordem.recusarReparo(entrada.reparoId);
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
