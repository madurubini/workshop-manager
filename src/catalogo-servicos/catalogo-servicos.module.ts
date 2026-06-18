import { Module } from '@nestjs/common';
import { CATALOGO_SERVICOS_API } from './aplicacao/catalogo-servicos.api';
import { CatalogoServicosApiService } from './aplicacao/catalogo-servicos-api.service';
import {
  AtualizarServico,
  CadastrarServico,
  RemoverServico,
} from './aplicacao/servico-crud.usecases';
import { SERVICO_REPOSITORY } from './dominio/repositorio';
import { PrismaServicoRepository } from './infraestrutura/prisma-servico.repository';
import { ServicosController } from './interfaces/servicos.controller';

/**
 * Catálogo de Serviços (suporte). Expõe a porta pública de consulta (usada pelo
 * diagnóstico para congelar preços) e o CRUD administrativo.
 */
@Module({
  controllers: [ServicosController],
  providers: [
    CadastrarServico,
    AtualizarServico,
    RemoverServico,
    { provide: SERVICO_REPOSITORY, useClass: PrismaServicoRepository },
    { provide: CATALOGO_SERVICOS_API, useClass: CatalogoServicosApiService },
  ],
  exports: [CATALOGO_SERVICOS_API],
})
export class CatalogoServicosModule {}
