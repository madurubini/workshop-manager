import { Module } from '@nestjs/common';
import { CatalogoServicosModule } from '../catalogo-servicos/catalogo-servicos.module';
import { ClientesVeiculosModule } from '../clientes-veiculos/clientes-veiculos.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { AbrirOrdemServico } from './aplicacao/abrir-ordem-servico.usecase';
import { AprovarOrcamento } from './aplicacao/aprovar-orcamento.usecase';
import { EnviarOrcamento } from './aplicacao/enviar-orcamento.usecase';
import { RecusarOrcamento } from './aplicacao/recusar-orcamento.usecase';
import { RegistrarDiagnostico } from './aplicacao/registrar-diagnostico.usecase';
import { ORDEM_SERVICO_CONSULTA } from './aplicacao/ordem-servico-consulta.api';
import { OrdemServicoConsultaService } from './aplicacao/ordem-servico-consulta.service';
import { ORDEM_SERVICO_REPOSITORY } from './dominio/repositorios';
import { PrismaOrdemServicoRepository } from './infraestrutura/prisma-ordem-servico.repository';
import { AcompanhamentoController } from './interfaces/acompanhamento.controller';
import { OrdensServicoController } from './interfaces/ordens-servico.controller';

/**
 * Contexto Ordem de Serviço (núcleo). Importa os outros contextos apenas para
 * receber as portas públicas que eles exportam (CLIENTES_VEICULOS_API,
 * CATALOGO_SERVICOS_API, ESTOQUE_API) — nunca seus repositórios ou entidades.
 * A reserva de estoque ao aprovar acontece por EVENTO (estoque escuta), não por
 * chamada direta.
 */
@Module({
  imports: [ClientesVeiculosModule, CatalogoServicosModule, EstoqueModule],
  controllers: [OrdensServicoController, AcompanhamentoController],
  providers: [
    AbrirOrdemServico,
    RegistrarDiagnostico,
    EnviarOrcamento,
    AprovarOrcamento,
    RecusarOrcamento,
    {
      provide: ORDEM_SERVICO_REPOSITORY,
      useClass: PrismaOrdemServicoRepository,
    },
    {
      provide: ORDEM_SERVICO_CONSULTA,
      useClass: OrdemServicoConsultaService,
    },
  ],
  exports: [ORDEM_SERVICO_CONSULTA],
})
export class OrdemServicoModule {}
