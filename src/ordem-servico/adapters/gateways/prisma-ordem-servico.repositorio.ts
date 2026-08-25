import { Injectable } from '@nestjs/common';
import {
  HistoricoStatus as HistoricoPrisma,
  Orcamento as OrcamentoPrisma,
  OrdemServico as OrdemPrisma,
  Prisma,
  PecaOrcada as PecaOrcadaPrisma,
  ServicoOrcado as ServicoOrcadoPrisma,
} from '@prisma/client';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import { ErroConflito } from '../../../compartilhado/erros/erros-dominio';
import {
  SituacaoPecaOrcada,
  StatusOrcamento,
  TipoOrcamento,
} from '../../entities/itens';
import { OrdemServico } from '../../entities/ordem-servico';
import { StatusOS, STATUS_FILA } from '../../entities/status-os';
import {
  FiltroOrdens,
  OrdemServicoRepository,
  PeriodoRelatorio,
  TempoExecucao,
} from '../../use-cases/ordem-servico.repositorio';

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
        data: ordem.historico.map((registro) => ({
          ordemId: ordem.id,
          status: registro.status,
          em: registro.em,
          por: registro.por,
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
        data: ordem.historico.map((registro) => ({
          ordemId: ordem.id,
          status: registro.status,
          em: registro.em,
          por: registro.por,
        })),
      });

      for (const orcamento of ordem.orcamentos) {
        await tx.orcamento.create({
          data: {
            id: orcamento.id,
            ordemId: ordem.id,
            tipo: orcamento.tipo,
            descricao: orcamento.descricao,
            totalServicos: orcamento.totalServicos,
            totalPecas: orcamento.totalPecas,
            total: orcamento.total,
            status: orcamento.status,
            criadoEm: orcamento.criadoEm,
            enviadoEm: orcamento.enviadoEm,
            respondidoEm: orcamento.respondidoEm,
          },
        });
        if (orcamento.servicos.length > 0) {
          await tx.servicoOrcado.createMany({
            data: orcamento.servicos.map((servico) => ({
              id: servico.id,
              orcamentoId: orcamento.id,
              servicoId: servico.servicoId,
              descricao: servico.descricao,
              quantidade: servico.quantidade,
              precoAplicado: servico.precoAplicado,
            })),
          });
        }
        if (orcamento.pecas.length > 0) {
          await tx.pecaOrcada.createMany({
            data: orcamento.pecas.map((peca) => ({
              id: peca.id,
              orcamentoId: orcamento.id,
              pecaId: peca.pecaId,
              descricao: peca.descricao,
              quantidade: peca.quantidade,
              precoAplicado: peca.precoAplicado,
              situacao: peca.situacao,
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
    return registros.map((registro) => this.mapear(registro));
  }

  async listarFila(): Promise<OrdemServico[]> {
    const registros = await this.prisma.ordemServico.findMany({
      where: { status: { in: STATUS_FILA } },
      include: INCLUDE_COMPLETO,
      orderBy: { criadoEm: 'asc' }, // mais antigas primeiro
    });
    return registros.map((registro) => this.mapear(registro));
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
      .filter(
        (registro) => registro.iniciadoExecucaoEm && registro.finalizadoEm,
      )
      .map((registro) => {
        // Distingue serviços repetidos entre orçamentos (ex.: inicial + adicional).
        const servicos = new Map<string, string>();
        for (const orcamento of registro.orcamentos) {
          for (const servico of orcamento.servicos) {
            servicos.set(servico.servicoId, servico.servico.nome);
          }
        }
        return {
          iniciadoExecucaoEm: registro.iniciadoExecucaoEm as Date,
          finalizadoEm: registro.finalizadoEm as Date,
          servicos: [...servicos].map(([id, nome]) => ({ id, nome })),
        };
      });
  }

  private mapear(registro: OrdemCompleta): OrdemServico {
    return OrdemServico.restaurar(registro.id, {
      numero: registro.numero,
      clienteId: registro.clienteId,
      veiculoId: registro.veiculoId,
      problemaRelatado: registro.problemaRelatado,
      status: registro.status as StatusOS,
      versao: registro.versao,
      pago: registro.pago,
      pagoEm: registro.pagoEm,
      criadoEm: registro.criadoEm,
      iniciadoExecucaoEm: registro.iniciadoExecucaoEm,
      finalizadoEm: registro.finalizadoEm,
      historico: registro.historico.map((h) => ({
        status: h.status as StatusOS,
        em: h.em,
        por: h.por,
      })),
      orcamentos: registro.orcamentos.map((orcamento) => ({
        id: orcamento.id,
        tipo: orcamento.tipo as TipoOrcamento,
        descricao: orcamento.descricao,
        totalServicos: Number(orcamento.totalServicos),
        totalPecas: Number(orcamento.totalPecas),
        total: Number(orcamento.total),
        status: orcamento.status as StatusOrcamento,
        criadoEm: orcamento.criadoEm,
        enviadoEm: orcamento.enviadoEm,
        respondidoEm: orcamento.respondidoEm,
        servicos: orcamento.servicos.map((servico) => ({
          id: servico.id,
          servicoId: servico.servicoId,
          descricao: servico.descricao,
          quantidade: servico.quantidade,
          precoAplicado: Number(servico.precoAplicado),
        })),
        pecas: orcamento.pecas.map((peca) => ({
          id: peca.id,
          pecaId: peca.pecaId,
          descricao: peca.descricao,
          quantidade: peca.quantidade,
          precoAplicado: Number(peca.precoAplicado),
          situacao: peca.situacao as SituacaoPecaOrcada,
        })),
      })),
    });
  }
}
