import { Module } from '@nestjs/common';
import { ESTOQUE_API } from './aplicacao/estoque.api';
import { EstoqueApiService } from './aplicacao/estoque-api.service';
import { FORNECEDOR } from './dominio/fornecedor';
import { COTACAO_REPOSITORY, PECA_REPOSITORY } from './dominio/repositorios';
import { FornecedorSimulado } from './infraestrutura/fornecedor-simulado';
import { PrismaCotacaoRepository } from './infraestrutura/prisma-cotacao.repository';
import { PrismaPecaRepository } from './infraestrutura/prisma-peca.repository';

/**
 * Contexto Estoque (raiz Peça). Na Fase 4 expõe a porta pública ESTOQUE_API
 * (verificar disponibilidade e cotar). O Fornecedor é uma porta com adaptador
 * simulado. Reservar/encomendar/baixar e o CRUD de peças entram nas Fases 5-8.
 */
@Module({
  providers: [
    { provide: PECA_REPOSITORY, useClass: PrismaPecaRepository },
    { provide: COTACAO_REPOSITORY, useClass: PrismaCotacaoRepository },
    { provide: FORNECEDOR, useClass: FornecedorSimulado },
    { provide: ESTOQUE_API, useClass: EstoqueApiService },
  ],
  exports: [ESTOQUE_API],
})
export class EstoqueModule {}
