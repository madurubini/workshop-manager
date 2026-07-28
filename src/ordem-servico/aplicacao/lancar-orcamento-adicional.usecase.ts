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
import { OrcadorDeItens } from './orcador-de-itens.service';

/**
 * Caso de uso: lançar um orçamento ADICIONAL durante a execução (o antigo
 * "reparo adicional"). Reaproveita o OrcadorDeItens (mesmo congelamento de
 * preço e verificação de estoque do diagnóstico). A OS cria o novo orçamento já
 * enviado e emite o evento que pede autorização ao cliente.
 */
@Injectable()
export class LancarOrcamentoAdicional {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    private readonly orcador: OrcadorDeItens,
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

    const servicos = await this.orcador.orcarServicos(entrada.servicos);
    const pecas = await this.orcador.orcarPecas(entrada.ordemId, entrada.pecas);

    ordem.adicionarOrcamentoAdicional({
      id: randomUUID(),
      descricao: entrada.descricao,
      servicos,
      pecas,
    });

    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
