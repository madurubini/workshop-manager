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

/**
 * Caso de uso: o cliente APROVA o orçamento. Leva a OS para "Em execução" e
 * publica OrcamentoAprovado — que o Estoque escuta para reservar as disponíveis
 * e encomendar as faltantes. A reserva acontece como efeito do evento, dentro
 * desta operação (publicar aguarda os assinantes).
 */
@Injectable()
export class AprovarOrcamento {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: {
    ordemId: string;
    orcamentoId: string;
    por?: string | null;
  }): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(entrada.ordemId);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', {
        ordemId: entrada.ordemId,
      });
    }
    ordem.aprovarOrcamento(entrada.orcamentoId, entrada.por);
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
