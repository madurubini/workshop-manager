import { Injectable } from '@nestjs/common';
import {
  HistoricoStatus as HistoricoPrisma,
  ItemPeca as ItemPecaPrisma,
  ItemServico as ItemServicoPrisma,
  Orcamento as OrcamentoPrisma,
  OrdemServico as OrdemPrisma,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { ErroConflito } from '../../compartilhado/erros/erros-dominio';
import { SituacaoItemPeca, StatusOrcamento } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import { FiltroOrdens, OrdemServicoRepository } from '../dominio/repositorios';
import { StatusOS } from '../dominio/status-os';

type OrdemCompleta = OrdemPrisma & {
  historico: HistoricoPrisma[];
  itensServico: ItemServicoPrisma[];
  itensPeca: ItemPecaPrisma[];
  orcamento: OrcamentoPrisma | null;
};

const INCLUDE_COMPLETO = {
  historico: { orderBy: { em: 'asc' } },
  itensServico: true,
  itensPeca: true,
  orcamento: true,
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
          versao: ordem.versao + 1,
        },
      });
      if (resultado.count === 0) {
        throw new ErroConflito(
          'A OS foi modificada por outra operação (versão desatualizada).',
          { ordemId: ordem.id },
        );
      }

      // O agregado é a fonte de verdade: regrava histórico, itens e orçamento.
      await tx.historicoStatus.deleteMany({ where: { ordemId: ordem.id } });
      await tx.historicoStatus.createMany({
        data: ordem.historico.map((h) => ({
          ordemId: ordem.id,
          status: h.status,
          em: h.em,
          por: h.por,
        })),
      });

      await tx.itemServico.deleteMany({ where: { ordemId: ordem.id } });
      if (ordem.itensServico.length > 0) {
        await tx.itemServico.createMany({
          data: ordem.itensServico.map((i) => ({
            id: i.id,
            ordemId: ordem.id,
            servicoId: i.servicoId,
            descricao: i.descricao,
            quantidade: i.quantidade,
            precoAplicado: i.precoAplicado,
            reparoId: i.reparoId,
          })),
        });
      }

      await tx.itemPeca.deleteMany({ where: { ordemId: ordem.id } });
      if (ordem.itensPeca.length > 0) {
        await tx.itemPeca.createMany({
          data: ordem.itensPeca.map((i) => ({
            id: i.id,
            ordemId: ordem.id,
            pecaId: i.pecaId,
            descricao: i.descricao,
            quantidade: i.quantidade,
            precoAplicado: i.precoAplicado,
            situacao: i.situacao,
            reparoId: i.reparoId,
          })),
        });
      }

      if (ordem.orcamento) {
        const o = ordem.orcamento;
        await tx.orcamento.upsert({
          where: { ordemId: ordem.id },
          create: {
            id: o.id,
            ordemId: ordem.id,
            totalServicos: o.totalServicos,
            totalPecas: o.totalPecas,
            total: o.total,
            status: o.status,
            enviadoEm: o.enviadoEm,
            respondidoEm: o.respondidoEm,
          },
          update: {
            totalServicos: o.totalServicos,
            totalPecas: o.totalPecas,
            total: o.total,
            status: o.status,
            enviadoEm: o.enviadoEm,
            respondidoEm: o.respondidoEm,
          },
        });
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

  private mapear(r: OrdemCompleta): OrdemServico {
    return OrdemServico.restaurar(r.id, {
      numero: r.numero,
      clienteId: r.clienteId,
      veiculoId: r.veiculoId,
      problemaRelatado: r.problemaRelatado,
      status: r.status as StatusOS,
      versao: r.versao,
      pago: r.pago,
      criadoEm: r.criadoEm,
      historico: r.historico.map((h) => ({
        status: h.status as StatusOS,
        em: h.em,
        por: h.por,
      })),
      itensServico: r.itensServico.map((i) => ({
        id: i.id,
        servicoId: i.servicoId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoAplicado: Number(i.precoAplicado),
        reparoId: i.reparoId,
      })),
      itensPeca: r.itensPeca.map((i) => ({
        id: i.id,
        pecaId: i.pecaId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoAplicado: Number(i.precoAplicado),
        situacao: i.situacao as SituacaoItemPeca,
        reparoId: i.reparoId,
      })),
      orcamento: r.orcamento
        ? {
            id: r.orcamento.id,
            totalServicos: Number(r.orcamento.totalServicos),
            totalPecas: Number(r.orcamento.totalPecas),
            total: Number(r.orcamento.total),
            status: r.orcamento.status as StatusOrcamento,
            enviadoEm: r.orcamento.enviadoEm,
            respondidoEm: r.orcamento.respondidoEm,
          }
        : null,
    });
  }
}
