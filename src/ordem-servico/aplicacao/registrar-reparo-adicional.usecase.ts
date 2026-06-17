import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import { MontadorDeItens } from './montador-de-itens.service';

/**
 * Caso de uso: lançar um reparo adicional durante a execução. Reaproveita o
 * MontadorDeItens (mesmo congelamento de preço e verificação de estoque do
 * diagnóstico). A OS atualiza o orçamento e emite o evento que pede autorização
 * ao cliente.
 */
@Injectable()
export class RegistrarReparoAdicional {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    private readonly montador: MontadorDeItens,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: {
    ordemId: string;
    descricao: string;
    servicos: { servicoId: string; quantidade: number }[];
    pecas: { pecaId: string; quantidade: number }[];
  }): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(entrada.ordemId);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', {
        ordemId: entrada.ordemId,
      });
    }

    const reparoId = randomUUID();
    const itensServico = await this.montador.montarServicos(
      entrada.servicos,
      reparoId,
    );
    const itensPeca = await this.montador.montarPecas(
      entrada.ordemId,
      entrada.pecas,
      reparoId,
    );

    ordem.adicionarReparo({
      id: reparoId,
      descricao: entrada.descricao,
      itensServico,
      itensPeca,
    });

    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
