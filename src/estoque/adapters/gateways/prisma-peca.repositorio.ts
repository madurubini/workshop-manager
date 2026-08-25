import { Injectable } from '@nestjs/common';
import { Peca as PecaPrisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import { Peca } from '../../entities/peca';
import { PecaRepository } from '../../use-cases/peca.repositorio';

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

  async salvar(peca: Peca): Promise<void> {
    await this.prisma.peca.update({
      where: { id: peca.id },
      data: {
        saldoFisico: peca.saldoFisico,
        reservado: peca.reservado,
        precoUnitario: peca.precoUnitario,
        nome: peca.nome,
        ativo: peca.ativo,
      },
    });
  }

  async buscarPorId(id: string): Promise<Peca | null> {
    const registro = await this.prisma.peca.findUnique({ where: { id } });
    return registro ? this.mapear(registro) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Peca | null> {
    const registro = await this.prisma.peca.findUnique({ where: { codigo } });
    return registro ? this.mapear(registro) : null;
  }

  async listar(): Promise<Peca[]> {
    const registros = await this.prisma.peca.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return registros.map((registro) => this.mapear(registro));
  }

  async reservarAtomico(entrada: {
    pecaId: string;
    ordemId: string;
    quantidade: number;
  }): Promise<boolean> {
    const { pecaId, ordemId, quantidade } = entrada;
    return this.prisma.$transaction(async (tx) => {
      // UPDATE condicional: só incrementa `reservado` se ainda houver
      // disponível. O Postgres faz a checagem e a escrita atomicamente, então
      // duas reservas concorrentes não conseguem ambas passar (sem corrida).
      const afetadas = await tx.$executeRaw`
        UPDATE "peca"
        SET "reservado" = "reservado" + ${quantidade}
        WHERE "id" = ${pecaId}::uuid
          AND "ativo" = true
          AND "saldoFisico" - "reservado" >= ${quantidade}`;

      if (afetadas === 0) {
        return false; // sem disponível (ou peça inexistente/inativa)
      }

      await tx.reservaEstoque.create({
        data: {
          id: randomUUID(),
          pecaId,
          ordemId,
          quantidade,
          status: 'RESERVADA',
        },
      });
      return true;
    });
  }

  private mapear(registro: PecaPrisma): Peca {
    return Peca.restaurar(registro.id, {
      codigo: registro.codigo,
      nome: registro.nome,
      precoUnitario: Number(registro.precoUnitario),
      saldoFisico: registro.saldoFisico,
      reservado: registro.reservado,
      ativo: registro.ativo,
    });
  }
}
