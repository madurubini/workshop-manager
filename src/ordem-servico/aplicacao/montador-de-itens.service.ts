import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CATALOGO_SERVICOS_API,
  CatalogoServicosApi,
} from '../../catalogo-servicos/aplicacao/catalogo-servicos.api';
import { ESTOQUE_API, EstoqueApi } from '../../estoque/aplicacao/estoque.api';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import {
  PecaOrcada,
  ServicoOrcado,
  SituacaoPecaOrcada,
} from '../dominio/itens';

/**
 * Serviço de aplicação compartilhado pelo diagnóstico e pelos orçamentos
 * adicionais. Concentra a regra de CONGELAR preços (do catálogo e do estoque)
 * e a verificação SOMENTE LEITURA do estoque, com cotação dos faltantes.
 *
 * Toda conversa com outros contextos passa pelas portas públicas
 * (CATALOGO_SERVICOS_API, ESTOQUE_API) — sem importar repositórios externos.
 */
@Injectable()
export class MontadorDeItens {
  constructor(
    @Inject(CATALOGO_SERVICOS_API)
    private readonly catalogo: CatalogoServicosApi,
    @Inject(ESTOQUE_API)
    private readonly estoque: EstoqueApi,
  ) {}

  async montarServicos(
    servicos: { servicoId: string; quantidade: number }[],
  ): Promise<ServicoOrcado[]> {
    const itens: ServicoOrcado[] = [];
    for (const s of servicos) {
      const servico = await this.catalogo.buscarServico(s.servicoId);
      if (!servico) {
        throw new ErroValidacao('Serviço do catálogo não encontrado.', {
          servicoId: s.servicoId,
        });
      }
      itens.push({
        id: randomUUID(),
        servicoId: servico.id,
        descricao: servico.nome, // snapshot
        quantidade: s.quantidade,
        precoAplicado: servico.precoBase, // congelado
      });
    }
    return itens;
  }

  async montarPecas(
    ordemId: string,
    pecas: { pecaId: string; quantidade: number }[],
  ): Promise<PecaOrcada[]> {
    if (pecas.length === 0) {
      return [];
    }

    // Verificação SOMENTE LEITURA do estoque (não reserva).
    const disponibilidades = await this.estoque.verificarDisponibilidade(
      pecas.map((p) => ({ pecaId: p.pecaId, quantidade: p.quantidade })),
    );
    const porPeca = new Map(disponibilidades.map((d) => [d.pecaId, d]));

    const itens: PecaOrcada[] = [];
    for (const p of pecas) {
      const d = porPeca.get(p.pecaId);
      if (!d || !d.encontrada) {
        throw new ErroValidacao('Peça não encontrada no estoque.', {
          pecaId: p.pecaId,
        });
      }

      if (d.suficiente) {
        itens.push({
          id: randomUUID(),
          pecaId: p.pecaId,
          descricao: d.nome,
          quantidade: p.quantidade,
          precoAplicado: d.precoUnitario, // congelado
          situacao: SituacaoPecaOrcada.DISPONIVEL,
        });
      } else {
        const cotacao = await this.estoque.solicitarCotacao(
          ordemId,
          p.pecaId,
          p.quantidade,
        );
        itens.push({
          id: randomUUID(),
          pecaId: p.pecaId,
          descricao: d.nome,
          quantidade: p.quantidade,
          precoAplicado: cotacao.preco, // congelado (preço cotado)
          situacao: SituacaoPecaOrcada.EM_COTACAO,
        });
      }
    }
    return itens;
  }
}
