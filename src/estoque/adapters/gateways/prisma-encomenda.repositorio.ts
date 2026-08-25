import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import {
  DadosEncomenda,
  EncomendaRepository,
  StatusEncomenda,
} from '../../use-cases/encomenda.repositorio';

@Injectable()
export class PrismaEncomendaRepository implements EncomendaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(dados: {
    pecaId: string;
    ordemId: string;
    quantidade: number;
  }): Promise<void> {
    await this.prisma.encomenda.create({
      data: {
        id: randomUUID(),
        pecaId: dados.pecaId,
        ordemId: dados.ordemId,
        quantidade: dados.quantidade,
        status: 'PENDENTE',
      },
    });
  }

  async listarPendentesDaPeca(pecaId: string): Promise<DadosEncomenda[]> {
    const registros = await this.prisma.encomenda.findMany({
      where: { pecaId, status: 'PENDENTE' },
      orderBy: { criadoEm: 'asc' }, // FIFO: quem encomendou primeiro é atendido antes
    });
    return registros.map((registro) => ({
      id: registro.id,
      pecaId: registro.pecaId,
      ordemId: registro.ordemId,
      quantidade: registro.quantidade,
      status: registro.status as StatusEncomenda,
    }));
  }

  async marcarRecebida(id: string): Promise<void> {
    await this.prisma.encomenda.update({
      where: { id },
      data: { status: 'RECEBIDA', recebidaEm: new Date() },
    });
  }

  async cancelarPendentesDaOrdem(ordemId: string): Promise<void> {
    await this.prisma.encomenda.updateMany({
      where: { ordemId, status: 'PENDENTE' },
      data: { status: 'CANCELADA' },
    });
  }
}
