import { Injectable } from '@nestjs/common';
import {
  HistoricoStatus as HistoricoPrisma,
  OrdemServico as OrdemPrisma,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { OrdemServico } from '../dominio/ordem-servico';
import { FiltroOrdens, OrdemServicoRepository } from '../dominio/repositorios';
import { StatusOS } from '../dominio/status-os';

type OrdemComHistorico = OrdemPrisma & { historico: HistoricoPrisma[] };

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

  async buscarPorId(id: string): Promise<OrdemServico | null> {
    const registro = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: { historico: { orderBy: { em: 'asc' } } },
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
      include: { historico: { orderBy: { em: 'asc' } } },
      orderBy: { criadoEm: 'desc' },
    });
    return registros.map((r) => this.mapear(r));
  }

  async proximoNumero(): Promise<string> {
    const total = await this.prisma.ordemServico.count();
    return `OS-${String(total + 1).padStart(6, '0')}`;
  }

  private mapear(r: OrdemComHistorico): OrdemServico {
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
    });
  }
}
