import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import {
  DadosReserva,
  ReservaRepository,
  StatusReserva,
} from '../dominio/repositorios';

@Injectable()
export class PrismaReservaRepository implements ReservaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(dados: DadosReserva): Promise<void> {
    await this.prisma.reservaEstoque.create({
      data: {
        id: randomUUID(),
        pecaId: dados.pecaId,
        ordemId: dados.ordemId,
        quantidade: dados.quantidade,
        status: dados.status,
      },
    });
  }

  async listarReservadasDaOrdem(ordemId: string): Promise<DadosReserva[]> {
    const registros = await this.prisma.reservaEstoque.findMany({
      where: { ordemId, status: 'RESERVADA' },
    });
    return registros.map((r) => ({
      pecaId: r.pecaId,
      ordemId: r.ordemId,
      quantidade: r.quantidade,
      status: r.status as StatusReserva,
    }));
  }

  async marcarBaixadasDaOrdem(ordemId: string): Promise<void> {
    await this.prisma.reservaEstoque.updateMany({
      where: { ordemId, status: 'RESERVADA' },
      data: { status: 'BAIXADA' },
    });
  }
}
