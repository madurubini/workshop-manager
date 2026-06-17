import { Injectable } from '@nestjs/common';
import { Peca as PecaPrisma } from '@prisma/client';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { Peca } from '../dominio/peca';
import { PecaRepository } from '../dominio/repositorios';

@Injectable()
export class PrismaPecaRepository implements PecaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async inserir(peca: Peca): Promise<void> {
    await this.prisma.peca.create({
      data: {
        id: peca.id,
        codigo: peca.codigo,
        nome: peca.nome,
        precoUnitario: peca.precoUnitario,
        saldoFisico: peca.saldoFisico,
        reservado: peca.reservado,
        ativo: peca.ativo,
      },
    });
  }

  async buscarPorId(id: string): Promise<Peca | null> {
    const r = await this.prisma.peca.findUnique({ where: { id } });
    return r ? this.mapear(r) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Peca | null> {
    const r = await this.prisma.peca.findUnique({ where: { codigo } });
    return r ? this.mapear(r) : null;
  }

  async listar(): Promise<Peca[]> {
    const registros = await this.prisma.peca.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return registros.map((r) => this.mapear(r));
  }

  private mapear(r: PecaPrisma): Peca {
    return Peca.restaurar(r.id, {
      codigo: r.codigo,
      nome: r.nome,
      precoUnitario: Number(r.precoUnitario),
      saldoFisico: r.saldoFisico,
      reservado: r.reservado,
      ativo: r.ativo,
    });
  }
}
