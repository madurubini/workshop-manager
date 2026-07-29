import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import {
  DadosReserva,
  ReservaRepository,
  StatusReserva,
} from '../../use-cases/reserva.repositorio';

/** Gateway Prisma da porta ReservaRepository. */
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
    return registros.map((registro) => ({
      pecaId: registro.pecaId,
      ordemId: registro.ordemId,
      quantidade: registro.quantidade,
      status: registro.status as StatusReserva,
    }));
  }

  async marcarBaixadasDaOrdem(ordemId: string): Promise<void> {
    await this.prisma.reservaEstoque.updateMany({
      where: { ordemId, status: 'RESERVADA' },
      data: { status: 'BAIXADA' },
    });
  }
}
