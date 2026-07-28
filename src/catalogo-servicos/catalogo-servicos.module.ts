import { Module } from '@nestjs/common';
import { CATALOGO_SERVICOS_API } from './use-cases/catalogo-servicos.api';
import { CatalogoServicosApiService } from './use-cases/catalogo-servicos-api.service';
import { ServicoUseCases } from './use-cases/servico.usecases';
import { SERVICO_REPOSITORY } from './use-cases/servico.repositorio';
import { PrismaServicoRepository } from './adapters/gateways/prisma-servico.repositorio';
import { ServicosController } from './adapters/controllers/servicos.controller';

/**
 * Catálogo de Serviços (suporte). Expõe a porta pública de consulta (usada pelo
 * diagnóstico para congelar preços) e o CRUD administrativo.
 */
@Module({
  controllers: [ServicosController],
  providers: [
    ServicoUseCases,
    { provide: SERVICO_REPOSITORY, useClass: PrismaServicoRepository },
    { provide: CATALOGO_SERVICOS_API, useClass: CatalogoServicosApiService },
  ],
  exports: [CATALOGO_SERVICOS_API],
})
export class CatalogoServicosModule {}
