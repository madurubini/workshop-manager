import { Injectable } from '@nestjs/common';
import { Veiculo as VeiculoPrisma } from '@prisma/client';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { Veiculo } from '../dominio/veiculo';
import { VeiculoRepository } from '../dominio/repositorios';

/** Adaptador Prisma da porta VeiculoRepository. */
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
      where: { clienteId },
      orderBy: { criadoEm: 'desc' },
    });
    return registros.map((r) => this.mapear(r));
  }

  private mapear(r: VeiculoPrisma): Veiculo {
    return Veiculo.restaurar(r.id, {
      clienteId: r.clienteId,
      placa: r.placa,
      marca: r.marca,
      modelo: r.modelo,
      ano: r.ano,
      ativo: r.ativo,
      criadoEm: r.criadoEm,
    });
  }
}
