import { Module } from '@nestjs/common';
import { CATALOGO_SERVICOS_API } from './aplicacao/catalogo-servicos.api';
import { CatalogoServicosApiService } from './aplicacao/catalogo-servicos-api.service';
import { SERVICO_REPOSITORY } from './dominio/repositorio';
import { PrismaServicoRepository } from './infraestrutura/prisma-servico.repository';

/**
 * Catálogo de Serviços (suporte). Por enquanto expõe só a porta pública de
 * consulta (usada pelo diagnóstico para congelar preços). Os endpoints de CRUD
 * entram na Fase 8.
 */
@Module({
  providers: [
    { provide: SERVICO_REPOSITORY, useClass: PrismaServicoRepository },
    { provide: CATALOGO_SERVICOS_API, useClass: CatalogoServicosApiService },
  ],
  exports: [CATALOGO_SERVICOS_API],
})
export class CatalogoServicosModule {}
