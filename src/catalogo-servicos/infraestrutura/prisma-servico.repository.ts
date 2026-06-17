import { Injectable } from '@nestjs/common';
import { Servico as ServicoPrisma } from '@prisma/client';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { Servico } from '../dominio/servico';
import { ServicoRepository } from '../dominio/repositorio';

@Injectable()
export class PrismaServicoRepository implements ServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async inserir(servico: Servico): Promise<void> {
    await this.prisma.servico.create({
      data: {
        id: servico.id,
        nome: servico.nome,
        descricao: servico.descricao,
        precoBase: servico.precoBase,
        ativo: servico.ativo,
      },
    });
  }

  async buscarPorId(id: string): Promise<Servico | null> {
    const r = await this.prisma.servico.findUnique({ where: { id } });
    return r ? this.mapear(r) : null;
  }

  async listar(): Promise<Servico[]> {
    const registros = await this.prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return registros.map((r) => this.mapear(r));
  }

  private mapear(r: ServicoPrisma): Servico {
    return Servico.restaurar(r.id, {
      nome: r.nome,
      descricao: r.descricao,
      precoBase: Number(r.precoBase),
      ativo: r.ativo,
    });
  }
}
