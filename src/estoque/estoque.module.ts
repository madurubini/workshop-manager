import { Module } from '@nestjs/common';
import { ESTOQUE_API } from './aplicacao/estoque.api';
import { EstoqueApiService } from './aplicacao/estoque-api.service';
import { BaixarNaConclusao } from './aplicacao/baixar-na-conclusao.policy';
import { ReservarNaAprovacao } from './aplicacao/reservar-na-aprovacao.policy';
import { FORNECEDOR } from './dominio/fornecedor';
import {
  COTACAO_REPOSITORY,
  PECA_REPOSITORY,
  RESERVA_REPOSITORY,
} from './dominio/repositorios';
import { FornecedorSimulado } from './infraestrutura/fornecedor-simulado';
import { PrismaCotacaoRepository } from './infraestrutura/prisma-cotacao.repository';
import { PrismaPecaRepository } from './infraestrutura/prisma-peca.repository';
import { PrismaReservaRepository } from './infraestrutura/prisma-reserva.repository';

/**
 * Contexto Estoque (raiz Peça). Expõe a porta pública ESTOQUE_API (verificar
 * disponibilidade e cotar) e contém a política ReservarNaAprovacao, que escuta
 * o evento de orçamento aprovado para reservar/encomendar. O Fornecedor é uma
 * porta com adaptador simulado. CRUD de peças entra na Fase 8.
 */
@Module({
  providers: [
    { provide: PECA_REPOSITORY, useClass: PrismaPecaRepository },
    { provide: COTACAO_REPOSITORY, useClass: PrismaCotacaoRepository },
    { provide: RESERVA_REPOSITORY, useClass: PrismaReservaRepository },
    { provide: FORNECEDOR, useClass: FornecedorSimulado },
    { provide: ESTOQUE_API, useClass: EstoqueApiService },
    ReservarNaAprovacao,
    BaixarNaConclusao,
  ],
  exports: [ESTOQUE_API],
})
export class EstoqueModule {}
