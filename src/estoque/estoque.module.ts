import { Module } from '@nestjs/common';
import { ESTOQUE_API } from './use-cases/estoque.api';
import { EstoqueApiService } from './use-cases/estoque-api.service';
import { AtenderEncomendasDaPeca } from './use-cases/atender-encomendas.service';
import { BaixarNaConclusao } from './use-cases/baixar-na-conclusao.policy';
import { CancelarEncomendasNoCancelamento } from './use-cases/cancelar-encomendas.policy';
import { PecaUseCases } from './use-cases/peca.usecases';
import { ReservarNaAprovacao } from './use-cases/reservar-na-aprovacao.policy';
import { FORNECEDOR } from './use-cases/fornecedor';
import { PECA_REPOSITORY } from './use-cases/peca.repositorio';
import { RESERVA_REPOSITORY } from './use-cases/reserva.repositorio';
import { ENCOMENDA_REPOSITORY } from './use-cases/encomenda.repositorio';
import { COTACAO_REPOSITORY } from './use-cases/cotacao.repositorio';
import { FornecedorSimulado } from './adapters/gateways/fornecedor-simulado';
import { PrismaCotacaoRepository } from './adapters/gateways/prisma-cotacao.repositorio';
import { PrismaEncomendaRepository } from './adapters/gateways/prisma-encomenda.repositorio';
import { PrismaPecaRepository } from './adapters/gateways/prisma-peca.repositorio';
import { PrismaReservaRepository } from './adapters/gateways/prisma-reserva.repositorio';
import { PecasController } from './adapters/controllers/pecas.controller';

/**
 * Contexto Estoque (raiz Peça). Expõe a porta pública ESTOQUE_API (verificar
 * disponibilidade e cotar) e contém as políticas que reagem a eventos da OS
 * (reservar na aprovação, baixar na conclusão, cancelar encomendas). O
 * Fornecedor é uma porta com adaptador simulado.
 */
@Module({
  controllers: [PecasController],
  providers: [
    { provide: PECA_REPOSITORY, useClass: PrismaPecaRepository },
    { provide: COTACAO_REPOSITORY, useClass: PrismaCotacaoRepository },
    { provide: RESERVA_REPOSITORY, useClass: PrismaReservaRepository },
    { provide: ENCOMENDA_REPOSITORY, useClass: PrismaEncomendaRepository },
    { provide: FORNECEDOR, useClass: FornecedorSimulado },
    { provide: ESTOQUE_API, useClass: EstoqueApiService },
    PecaUseCases,
    AtenderEncomendasDaPeca,
    ReservarNaAprovacao,
    BaixarNaConclusao,
    CancelarEncomendasNoCancelamento,
  ],
  exports: [ESTOQUE_API],
})
export class EstoqueModule {}
