import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CATALOGO_SERVICOS_API,
  CatalogoServicosApi,
} from '../../catalogo-servicos/aplicacao/catalogo-servicos.api';
import { ESTOQUE_API, EstoqueApi } from '../../estoque/aplicacao/estoque.api';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { ItemPeca, ItemServico, SituacaoItemPeca } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';

export interface EntradaRegistrarDiagnostico {
  ordemId: string;
  servicos: { servicoId: string; quantidade: number }[];
  pecas: { pecaId: string; quantidade: number }[];
  por?: string | null;
}

/**
 * Caso de uso central da Fatia 2. Num único comando:
 *  1. monta os itens de serviço, CONGELANDO o preço base do catálogo;
 *  2. verifica o estoque (SOMENTE LEITURA — não reserva nada);
 *  3. para peça em falta, solicita cotação ao fornecedor e congela o preço
 *     cotado, marcando o item como EM_COTACAO;
 *  4. delega à OS o registro do diagnóstico, que gera o orçamento e leva a OS
 *     de Recebida → Em diagnóstico.
 *
 * Tudo que toca outro contexto passa por porta pública (CATALOGO/ESTOQUE_API):
 * nenhuma entidade/repositório externo é importado aqui.
 */
@Injectable()
export class RegistrarDiagnostico {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(CATALOGO_SERVICOS_API)
    private readonly catalogo: CatalogoServicosApi,
    @Inject(ESTOQUE_API)
    private readonly estoque: EstoqueApi,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: EntradaRegistrarDiagnostico): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(entrada.ordemId);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', {
        ordemId: entrada.ordemId,
      });
    }

    const itensServico = await this.montarItensServico(entrada.servicos);
    const itensPeca = await this.montarItensPeca(
      entrada.ordemId,
      entrada.pecas,
    );

    ordem.registrarDiagnostico({
      itensServico,
      itensPeca,
      orcamentoId: randomUUID(),
      por: entrada.por,
    });

    await this.ordens.atualizar(ordem);
    this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }

  private async montarItensServico(
    servicos: { servicoId: string; quantidade: number }[],
  ): Promise<ItemServico[]> {
    const itens: ItemServico[] = [];
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
        reparoId: null,
      });
    }
    return itens;
  }

  private async montarItensPeca(
    ordemId: string,
    pecas: { pecaId: string; quantidade: number }[],
  ): Promise<ItemPeca[]> {
    if (pecas.length === 0) {
      return [];
    }

    // Verificação SOMENTE LEITURA do estoque (não reserva).
    const disponibilidades = await this.estoque.verificarDisponibilidade(
      pecas.map((p) => ({ pecaId: p.pecaId, quantidade: p.quantidade })),
    );
    const porPeca = new Map(disponibilidades.map((d) => [d.pecaId, d]));

    const itens: ItemPeca[] = [];
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
          situacao: SituacaoItemPeca.DISPONIVEL,
          reparoId: null,
        });
      } else {
        // Em falta → cota com o fornecedor e congela o preço cotado.
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
          situacao: SituacaoItemPeca.EM_COTACAO,
          reparoId: null,
        });
      }
    }
    return itens;
  }
}
