import { Inject, Injectable } from '@nestjs/common';
import {
  GERADOR_DE_ID,
  GeradorDeId,
} from '../../compartilhado/dominio/gerador-de-id';
import {
  CATALOGO_SERVICOS_API,
  CatalogoServicosApi,
} from '../../catalogo-servicos/use-cases/catalogo-servicos.api';
import { ESTOQUE_API, EstoqueApi } from '../../estoque/use-cases/estoque.api';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import {
  PecaOrcada,
  ServicoOrcado,
  SituacaoPecaOrcada,
} from '../entities/itens';

/**
 * Orça os itens da OS — usado pelo diagnóstico e pelos orçamentos adicionais.
 * Congela os preços, consulta o estoque em modo leitura e cota as peças em
 * falta, sempre pelas portas públicas dos outros contextos.
 */
@Injectable()
export class OrcadorDeItens {
  constructor(
    @Inject(CATALOGO_SERVICOS_API)
    private readonly catalogo: CatalogoServicosApi,
    @Inject(ESTOQUE_API)
    private readonly estoque: EstoqueApi,
    @Inject(GERADOR_DE_ID)
    private readonly ids: GeradorDeId,
  ) {}

  async orcarServicos(
    servicosPedidos: { servicoId: string; quantidade: number }[],
  ): Promise<ServicoOrcado[]> {
    const servicosOrcados: ServicoOrcado[] = [];
    for (const servicoPedido of servicosPedidos) {
      const servico = await this.catalogo.buscarServico(
        servicoPedido.servicoId,
      );
      if (!servico) {
        throw new ErroValidacao('Serviço do catálogo não encontrado.', {
          servicoId: servicoPedido.servicoId,
        });
      }
      servicosOrcados.push({
        id: this.ids.novo(),
        servicoId: servico.id,
        descricao: servico.nome, // snapshot
        quantidade: servicoPedido.quantidade,
        precoAplicado: servico.precoBase, // congelado
      });
    }
    return servicosOrcados;
  }

  async orcarPecas(
    ordemId: string,
    pecasPedidas: { pecaId: string; quantidade: number }[],
  ): Promise<PecaOrcada[]> {
    if (pecasPedidas.length === 0) {
      return [];
    }

    // Verificação SOMENTE LEITURA do estoque (não reserva).
    const disponibilidades = await this.estoque.verificarDisponibilidade(
      pecasPedidas.map((peca) => ({
        pecaId: peca.pecaId,
        quantidade: peca.quantidade,
      })),
    );
    const disponibilidadePorPeca = new Map(
      disponibilidades.map((disponibilidade) => [
        disponibilidade.pecaId,
        disponibilidade,
      ]),
    );

    const pecasOrcadas: PecaOrcada[] = [];
    for (const pecaPedida of pecasPedidas) {
      const disponibilidade = disponibilidadePorPeca.get(pecaPedida.pecaId);
      if (!disponibilidade || !disponibilidade.encontrada) {
        throw new ErroValidacao('Peça não encontrada no estoque.', {
          pecaId: pecaPedida.pecaId,
        });
      }

      if (disponibilidade.suficiente) {
        pecasOrcadas.push({
          id: this.ids.novo(),
          pecaId: pecaPedida.pecaId,
          descricao: disponibilidade.nome,
          quantidade: pecaPedida.quantidade,
          precoAplicado: disponibilidade.precoUnitario, // congelado
          situacao: SituacaoPecaOrcada.DISPONIVEL,
        });
      } else {
        const cotacao = await this.estoque.solicitarCotacao(
          ordemId,
          pecaPedida.pecaId,
          pecaPedida.quantidade,
        );
        pecasOrcadas.push({
          id: this.ids.novo(),
          pecaId: pecaPedida.pecaId,
          descricao: disponibilidade.nome,
          quantidade: pecaPedida.quantidade,
          precoAplicado: cotacao.preco, // congelado (preço cotado)
          situacao: SituacaoPecaOrcada.EM_COTACAO,
        });
      }
    }
    return pecasOrcadas;
  }
}
