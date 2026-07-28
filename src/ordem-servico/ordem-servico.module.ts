import { Module } from '@nestjs/common';
import { CatalogoServicosModule } from '../catalogo-servicos/catalogo-servicos.module';
import { ClientesVeiculosModule } from '../clientes-veiculos/clientes-veiculos.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { IdentidadeModule } from '../identidade/identidade.module';
import { AbrirOrdemServico } from './aplicacao/abrir-ordem-servico.usecase';
import { AprovarOrcamento } from './aplicacao/aprovar-orcamento.usecase';
import { ConcluirExecucao } from './aplicacao/concluir-execucao.usecase';
import {
  ConfirmarPagamento,
  EntregarVeiculo,
} from './aplicacao/entrega.usecases';
import { IniciarDiagnostico } from './aplicacao/iniciar-diagnostico.usecase';
import { LancarOrcamentoAdicional } from './aplicacao/lancar-orcamento-adicional.usecase';
import { OrcadorDeItens } from './aplicacao/orcador-de-itens.service';
import { ORDEM_SERVICO_CONSULTA } from './aplicacao/ordem-servico-consulta.api';
import { OrdemServicoConsultaService } from './aplicacao/ordem-servico-consulta.service';
import { RecusarOrcamento } from './aplicacao/recusar-orcamento.usecase';
import { RegistrarDiagnostico } from './aplicacao/registrar-diagnostico.usecase';
import { RelatorioTempoMedioExecucao } from './aplicacao/relatorio-tempo-medio.usecase';
import { RetomarExecucaoAoReceberPeca } from './aplicacao/retomar-execucao.policy';
import { ORDEM_SERVICO_REPOSITORY } from './dominio/repositorios';
import { PrismaOrdemServicoRepository } from './infraestrutura/prisma-ordem-servico.repository';
import { AcompanhamentoController } from './interfaces/acompanhamento.controller';
import { OrdensServicoController } from './interfaces/ordens-servico.controller';
import { RelatoriosController } from './interfaces/relatorios.controller';

/**
 * Contexto Ordem de Serviço (núcleo). Importa os outros contextos apenas para
 * receber as portas públicas que eles exportam (CLIENTES_VEICULOS_API,
 * CATALOGO_SERVICOS_API, ESTOQUE_API) — nunca seus repositórios ou entidades.
 * Reservar (na aprovação) e baixar (na conclusão) acontecem por EVENTO no
 * Estoque, não por chamada direta.
 */
@Module({
  imports: [
    ClientesVeiculosModule,
    CatalogoServicosModule,
    EstoqueModule,
    IdentidadeModule,
  ],
  controllers: [
    OrdensServicoController,
    AcompanhamentoController,
    RelatoriosController,
  ],
  providers: [
    OrcadorDeItens,
    AbrirOrdemServico,
    IniciarDiagnostico,
    RegistrarDiagnostico,
    AprovarOrcamento,
    RecusarOrcamento,
    ConcluirExecucao,
    LancarOrcamentoAdicional,
    ConfirmarPagamento,
    EntregarVeiculo,
    RelatorioTempoMedioExecucao,
    RetomarExecucaoAoReceberPeca,
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
