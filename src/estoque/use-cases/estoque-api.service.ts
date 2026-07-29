import { Inject, Injectable } from '@nestjs/common';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { FORNECEDOR, Fornecedor } from './fornecedor';
import { PECA_REPOSITORY, PecaRepository } from './peca.repositorio';
import { COTACAO_REPOSITORY, CotacaoRepository } from './cotacao.repositorio';
import {
  DisponibilidadePeca,
  EstoqueApi,
  ResultadoCotacao,
} from './estoque.api';

@Injectable()
export class EstoqueApiService implements EstoqueApi {
  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
    @Inject(COTACAO_REPOSITORY)
    private readonly cotacoes: CotacaoRepository,
    @Inject(FORNECEDOR)
    private readonly fornecedor: Fornecedor,
  ) {}

  /** Somente leitura: consulta saldo disponível, não reserva nada. */
  async verificarDisponibilidade(
    itens: { pecaId: string; quantidade: number }[],
  ): Promise<DisponibilidadePeca[]> {
    const resultado: DisponibilidadePeca[] = [];
    for (const item of itens) {
      const peca = await this.pecas.buscarPorId(item.pecaId);
      if (!peca || !peca.ativo) {
        resultado.push({
          pecaId: item.pecaId,
          encontrada: false,
          nome: '',
          precoUnitario: 0,
          disponivel: 0,
          suficiente: false,
        });
        continue;
      }
      resultado.push({
        pecaId: peca.id,
        encontrada: true,
        nome: peca.nome,
        precoUnitario: peca.precoUnitario,
        disponivel: peca.disponivel,
        suficiente: peca.temDisponivel(item.quantidade),
      });
    }
    return resultado;
  }

  /** Pede cotação ao fornecedor e registra (cotação ≠ compra). */
  async solicitarCotacao(
    ordemId: string,
    pecaId: string,
    quantidade: number,
  ): Promise<ResultadoCotacao> {
    const peca = await this.pecas.buscarPorId(pecaId);
    if (!peca) {
      throw new ErroNaoEncontrado('Peça não encontrada.', { pecaId });
    }

    const cotacao = await this.fornecedor.cotar({
      pecaId,
      quantidade,
      precoReferencia: peca.precoUnitario,
    });

    await this.cotacoes.registrar({
      ordemId,
      pecaId,
      preco: cotacao.preco,
      prazoDias: cotacao.prazoDias,
      fornecedor: cotacao.fornecedor,
    });

    return {
      preco: cotacao.preco,
      prazoDias: cotacao.prazoDias,
      fornecedor: cotacao.fornecedor,
    };
  }
}
