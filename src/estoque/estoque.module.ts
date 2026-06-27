import { Module } from '@nestjs/common';
import { ESTOQUE_API } from './aplicacao/estoque.api';
import { EstoqueApiService } from './aplicacao/estoque-api.service';
import { AtenderEncomendasDaPeca } from './aplicacao/atender-encomendas.service';
import { BaixarNaConclusao } from './aplicacao/baixar-na-conclusao.policy';
import { CancelarEncomendasNoCancelamento } from './aplicacao/cancelar-encomendas.policy';
import {
  AjustarEstoque,
  AtualizarPeca,
  CadastrarPeca,
  RemoverPeca,
} from './aplicacao/peca-crud.usecases';
import { ReservarNaAprovacao } from './aplicacao/reservar-na-aprovacao.policy';
import { FORNECEDOR } from './dominio/fornecedor';
import {
  COTACAO_REPOSITORY,
  ENCOMENDA_REPOSITORY,
  PECA_REPOSITORY,
  RESERVA_REPOSITORY,
} from './dominio/repositorios';
import { FornecedorSimulado } from './infraestrutura/fornecedor-simulado';
import { PrismaCotacaoRepository } from './infraestrutura/prisma-cotacao.repository';
import { PrismaEncomendaRepository } from './infraestrutura/prisma-encomenda.repository';
import { PrismaPecaRepository } from './infraestrutura/prisma-peca.repository';
import { PrismaReservaRepository } from './infraestrutura/prisma-reserva.repository';
import { PecasController } from './interfaces/pecas.controller';

/**
 * Contexto Estoque (raiz Peça). Expõe a porta pública ESTOQUE_API (verificar
 * disponibilidade e cotar) e contém a política ReservarNaAprovacao, que escuta
 * o evento de orçamento aprovado para reservar/encomendar. O Fornecedor é uma
 * porta com adaptador simulado. CRUD de peças entra na Fase 8.
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
    CadastrarPeca,
    AtualizarPeca,
    RemoverPeca,
    AjustarEstoque,
    AtenderEncomendasDaPeca,
    ReservarNaAprovacao,
    BaixarNaConclusao,
    CancelarEncomendasNoCancelamento,
  ],
  exports: [ESTOQUE_API],
})
export class EstoqueModule {}
