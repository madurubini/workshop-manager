import { Injectable } from '@nestjs/common';
import { Cliente as ClientePrisma } from '@prisma/client';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import { Cliente } from '../../entities/cliente';
import { ClienteRepository } from '../../use-cases/cliente.repositorio';

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async inserir(cliente: Cliente): Promise<void> {
    await this.prisma.cliente.create({
      data: {
        id: cliente.id,
        tipoDocumento: cliente.documento.tipo,
        documento: cliente.documento.valor,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        ativo: cliente.ativo,
        criadoEm: cliente.criadoEm,
      },
    });
  }

  async salvar(cliente: Cliente): Promise<void> {
    await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        ativo: cliente.ativo,
      },
    });
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    const registro = await this.prisma.cliente.findUnique({ where: { id } });
    return registro ? this.mapear(registro) : null;
  }

  async buscarPorDocumento(documento: string): Promise<Cliente | null> {
    const registro = await this.prisma.cliente.findUnique({
      where: { documento },
    });
    return registro ? this.mapear(registro) : null;
  }

  async listar(): Promise<Cliente[]> {
    const registros = await this.prisma.cliente.findMany({
      where: { ativo: true }, // soft delete: não retorna inativos
      orderBy: { criadoEm: 'desc' },
    });
    return registros.map((registro) => this.mapear(registro));
  }

  private mapear(registro: ClientePrisma): Cliente {
    return Cliente.restaurar(registro.id, {
      documento: registro.documento,
      nome: registro.nome,
      email: registro.email,
      telefone: registro.telefone,
      ativo: registro.ativo,
      criadoEm: registro.criadoEm,
    });
  }
}
