import { Injectable } from '@nestjs/common';
import { Servico as ServicoPrisma } from '@prisma/client';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import { Servico } from '../../entities/servico';
import { ServicoRepository } from '../../use-cases/servico.repositorio';

/**
 * Gateway (Adaptador de Interface) do agregado Servico: implementa a porta
 * `ServicoRepository` traduzindo entre o Prisma e a entidade. O Prisma Client
 * em si é o Framework & Driver (detalhe); aqui só adaptamos os dados.
 */
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

  async salvar(servico: Servico): Promise<void> {
    await this.prisma.servico.update({
      where: { id: servico.id },
      data: {
        nome: servico.nome,
        descricao: servico.descricao,
        precoBase: servico.precoBase,
        ativo: servico.ativo,
      },
    });
  }

  async buscarPorId(id: string): Promise<Servico | null> {
    const registro = await this.prisma.servico.findUnique({ where: { id } });
    return registro ? this.mapear(registro) : null;
  }

  async listar(): Promise<Servico[]> {
    const registros = await this.prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return registros.map((registro) => this.mapear(registro));
  }

  private mapear(registro: ServicoPrisma): Servico {
    return Servico.restaurar(registro.id, {
      nome: registro.nome,
      descricao: registro.descricao,
      precoBase: Number(registro.precoBase),
      ativo: registro.ativo,
    });
  }
}
