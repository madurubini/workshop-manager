import { Injectable } from '@nestjs/common';
import { Veiculo as VeiculoPrisma } from '@prisma/client';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import { Veiculo } from '../../entities/veiculo';
import { VeiculoRepository } from '../../use-cases/veiculo.repositorio';

/** Gateway Prisma da porta VeiculoRepository. */
@Injectable()
export class PrismaVeiculoRepository implements VeiculoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async inserir(veiculo: Veiculo): Promise<void> {
    await this.prisma.veiculo.create({
      data: {
        id: veiculo.id,
        clienteId: veiculo.clienteId,
        placa: veiculo.placa.valor,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        ativo: veiculo.ativo,
        criadoEm: veiculo.criadoEm,
      },
    });
  }

  async salvar(veiculo: Veiculo): Promise<void> {
    await this.prisma.veiculo.update({
      where: { id: veiculo.id },
      data: {
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        ativo: veiculo.ativo,
      },
    });
  }

  async buscarPorId(id: string): Promise<Veiculo | null> {
    const registro = await this.prisma.veiculo.findUnique({ where: { id } });
    return registro ? this.mapear(registro) : null;
  }

  async buscarPorPlaca(placa: string): Promise<Veiculo | null> {
    const registro = await this.prisma.veiculo.findUnique({
      where: { placa },
    });
    return registro ? this.mapear(registro) : null;
  }

  async listarPorCliente(clienteId: string): Promise<Veiculo[]> {
    const registros = await this.prisma.veiculo.findMany({
      where: { clienteId, ativo: true }, // soft delete: não retorna inativos
      orderBy: { criadoEm: 'desc' },
    });
    return registros.map((registro) => this.mapear(registro));
  }

  private mapear(registro: VeiculoPrisma): Veiculo {
    return Veiculo.restaurar(registro.id, {
      clienteId: registro.clienteId,
      placa: registro.placa,
      marca: registro.marca,
      modelo: registro.modelo,
      ano: registro.ano,
      ativo: registro.ativo,
      criadoEm: registro.criadoEm,
    });
  }
}
