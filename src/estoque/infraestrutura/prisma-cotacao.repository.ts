import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { CotacaoRepository, DadosCotacao } from '../dominio/repositorios';

@Injectable()
export class PrismaCotacaoRepository implements CotacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(dados: DadosCotacao): Promise<void> {
    await this.prisma.cotacao.create({
      data: {
        id: randomUUID(),
        ordemId: dados.ordemId,
        pecaId: dados.pecaId,
        preco: dados.preco,
        prazoDias: dados.prazoDias,
        fornecedor: dados.fornecedor,
      },
    });
  }
}
