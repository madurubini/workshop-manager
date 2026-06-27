import { Injectable } from '@nestjs/common';
import {
  HistoricoStatus as HistoricoPrisma,
  Orcamento as OrcamentoPrisma,
  OrdemServico as OrdemPrisma,
  PecaOrcada as PecaOrcadaPrisma,
  Prisma,
  ServicoOrcado as ServicoOrcadoPrisma,
} from '@prisma/client';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { ErroConflito } from '../../compartilhado/erros/erros-dominio';
import {
  SituacaoPecaOrcada,
  StatusOrcamento,
  TipoOrcamento,
} from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import {
  FiltroOrdens,
  OrdemServicoRepository,
  PeriodoRelatorio,
  TempoExecucao,
} from '../dominio/repositorios';
import { StatusOS } from '../dominio/status-os';

type OrcamentoCompleto = OrcamentoPrisma & {
  servicos: ServicoOrcadoPrisma[];
  pecas: PecaOrcadaPrisma[];
};

type OrdemCompleta = OrdemPrisma & {
  historico: HistoricoPrisma[];
  orcamentos: OrcamentoCompleto[];
};

const INCLUDE_COMPLETO = {
  historico: { orderBy: { em: 'asc' } },
  orcamentos: {
    orderBy: { criadoEm: 'asc' },
    include: { servicos: true, pecas: true },
  },
} as const;

/** Adaptador Prisma da porta OrdemServicoRepository. */
@Injectable()
export class PrismaOrdemServicoRepository implements OrdemServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async inserir(ordem: OrdemServico): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.ordemServico.create({
        data: {
          id: ordem.id,
          numero: ordem.numero,
          clienteId: ordem.clienteId,
          veiculoId: ordem.veiculoId,
          problemaRelatado: ordem.problemaRelatado,
          status: ordem.status,
          versao: ordem.versao,
          pago: ordem.pago,
          criadoEm: ordem.criadoEm,
        },
      });
      await tx.historicoStatus.createMany({
        data: ordem.historico.map((h) => ({
          ordemId: ordem.id,
          status: h.status,
          em: h.em,
          por: h.por,
        })),
      });
    });
  }

  async atualizar(ordem: OrdemServico): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Optimistic lock: só atualiza se a versão no banco for a que carregamos.
      const resultado = await tx.ordemServico.updateMany({
        where: { id: ordem.id, versao: ordem.versao },
        data: {
          status: ordem.status,
          pago: ordem.pago,
          pagoEm: ordem.pagoEm,
          iniciadoExecucaoEm: ordem.iniciadoExecucaoEm,
          finalizadoEm: ordem.finalizadoEm,
          versao: ordem.versao + 1,
        },
      });
      if (resultado.count === 0) {
        throw new ErroConflito(
          'A OS foi modificada por outra operação (versão desatualizada).',
          { ordemId: ordem.id },
        );
      }

      // O agregado é a fonte de verdade: regrava histórico e orçamentos (com
      // suas linhas). Apaga as linhas (filhas) antes dos orçamentos (pais) por
      // causa da FK orcamentoId; recria os orçamentos antes das linhas.
      await tx.historicoStatus.deleteMany({ where: { ordemId: ordem.id } });
      await tx.servicoOrcado.deleteMany({
        where: { orcamento: { ordemId: ordem.id } },
      });
      await tx.pecaOrcada.deleteMany({
        where: { orcamento: { ordemId: ordem.id } },
      });
      await tx.orcamento.deleteMany({ where: { ordemId: ordem.id } });

      await tx.historicoStatus.createMany({
        data: ordem.historico.map((h) => ({
          ordemId: ordem.id,
          status: h.status,
          em: h.em,
          por: h.por,
        })),
      });

      for (const o of ordem.orcamentos) {
        await tx.orcamento.create({
          data: {
            id: o.id,
            ordemId: ordem.id,
            tipo: o.tipo,
            descricao: o.descricao,
            totalServicos: o.totalServicos,
            totalPecas: o.totalPecas,
            total: o.total,
            status: o.status,
            criadoEm: o.criadoEm,
            enviadoEm: o.enviadoEm,
            respondidoEm: o.respondidoEm,
          },
        });
        if (o.servicos.length > 0) {
          await tx.servicoOrcado.createMany({
            data: o.servicos.map((i) => ({
              id: i.id,
              orcamentoId: o.id,
              servicoId: i.servicoId,
              descricao: i.descricao,
              quantidade: i.quantidade,
              precoAplicado: i.precoAplicado,
            })),
          });
        }
        if (o.pecas.length > 0) {
          await tx.pecaOrcada.createMany({
            data: o.pecas.map((i) => ({
              id: i.id,
              orcamentoId: o.id,
              pecaId: i.pecaId,
              descricao: i.descricao,
              quantidade: i.quantidade,
              precoAplicado: i.precoAplicado,
              situacao: i.situacao,
            })),
          });
        }
      }
    });
  }

  async buscarPorId(id: string): Promise<OrdemServico | null> {
    const registro = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: INCLUDE_COMPLETO,
    });
    return registro ? this.mapear(registro) : null;
  }

  async listar(filtro?: FiltroOrdens): Promise<OrdemServico[]> {
    const where: Prisma.OrdemServicoWhereInput = {};
    if (filtro?.status) {
      where.status = filtro.status;
    }
    if (filtro?.clienteId) {
      where.clienteId = filtro.clienteId;
    }
    const registros = await this.prisma.ordemServico.findMany({
      where,
      include: INCLUDE_COMPLETO,
      orderBy: { criadoEm: 'desc' },
    });
    return registros.map((r) => this.mapear(r));
  }

  async proximoNumero(): Promise<string> {
    const total = await this.prisma.ordemServico.count();
    return `OS-${String(total + 1).padStart(6, '0')}`;
  }

  async listarTemposExecucao(
    periodo?: PeriodoRelatorio,
  ): Promise<TempoExecucao[]> {
    const finalizadoEm: Prisma.DateTimeFilter = {};
    if (periodo?.inicio) {
      finalizadoEm.gte = periodo.inicio;
    }
    if (periodo?.fim) {
      finalizadoEm.lte = periodo.fim;
    }
    const registros = await this.prisma.ordemServico.findMany({
      where: {
        iniciadoExecucaoEm: { not: null },
        finalizadoEm:
          periodo?.inicio || periodo?.fim ? finalizadoEm : { not: null },
      },
      select: {
        iniciadoExecucaoEm: true,
        finalizadoEm: true,
        // Só os serviços que foram de fato executados (orçamento aprovado).
        orcamentos: {
          where: { status: 'APROVADO' },
          select: {
            servicos: {
              select: { servicoId: true, servico: { select: { nome: true } } },
            },
          },
        },
      },
    });
    return registros
      .filter((r) => r.iniciadoExecucaoEm && r.finalizadoEm)
      .map((r) => {
        // Distingue serviços repetidos entre orçamentos (ex.: inicial + adicional).
        const servicos = new Map<string, string>();
        for (const orc of r.orcamentos) {
          for (const s of orc.servicos) {
            servicos.set(s.servicoId, s.servico.nome);
          }
        }
        return {
          iniciadoExecucaoEm: r.iniciadoExecucaoEm as Date,
          finalizadoEm: r.finalizadoEm as Date,
          servicos: [...servicos].map(([id, nome]) => ({ id, nome })),
        };
      });
  }

  private mapear(r: OrdemCompleta): OrdemServico {
    return OrdemServico.restaurar(r.id, {
      numero: r.numero,
      clienteId: r.clienteId,
      veiculoId: r.veiculoId,
      problemaRelatado: r.problemaRelatado,
      status: r.status as StatusOS,
      versao: r.versao,
      pago: r.pago,
      pagoEm: r.pagoEm,
      criadoEm: r.criadoEm,
      iniciadoExecucaoEm: r.iniciadoExecucaoEm,
      finalizadoEm: r.finalizadoEm,
      historico: r.historico.map((h) => ({
        status: h.status as StatusOS,
        em: h.em,
        por: h.por,
      })),
      orcamentos: r.orcamentos.map((o) => ({
        id: o.id,
        tipo: o.tipo as TipoOrcamento,
        descricao: o.descricao,
        totalServicos: Number(o.totalServicos),
        totalPecas: Number(o.totalPecas),
        total: Number(o.total),
        status: o.status as StatusOrcamento,
        criadoEm: o.criadoEm,
        enviadoEm: o.enviadoEm,
        respondidoEm: o.respondidoEm,
        servicos: o.servicos.map((i) => ({
          id: i.id,
          servicoId: i.servicoId,
          descricao: i.descricao,
          quantidade: i.quantidade,
          precoAplicado: Number(i.precoAplicado),
        })),
        pecas: o.pecas.map((i) => ({
          id: i.id,
          pecaId: i.pecaId,
          descricao: i.descricao,
          quantidade: i.quantidade,
          precoAplicado: Number(i.precoAplicado),
          situacao: i.situacao as SituacaoPecaOrcada,
        })),
      })),
    });
  }
}
