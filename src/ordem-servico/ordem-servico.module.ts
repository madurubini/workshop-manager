import { Module } from '@nestjs/common';
import { CatalogoServicosModule } from '../catalogo-servicos/catalogo-servicos.module';
import { ClientesVeiculosModule } from '../clientes-veiculos/clientes-veiculos.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { IdentidadeModule } from '../identidade/identidade.module';
import { AbrirOrdemServico } from './use-cases/abrir-ordem-servico.usecase';
import { AlterarStatusDaOrdem } from './use-cases/alterar-status.usecase';
import { AprovarOrcamento } from './use-cases/aprovar-orcamento.usecase';
import { ConcluirExecucao } from './use-cases/concluir-execucao.usecase';
import { ConsultarOrdemServico } from './use-cases/consultar-ordem-servico.usecase';
import {
  ConfirmarPagamento,
  EntregarVeiculo,
} from './use-cases/entrega.usecases';
import { IniciarDiagnostico } from './use-cases/iniciar-diagnostico.usecase';
import { LancarOrcamentoAdicional } from './use-cases/lancar-orcamento-adicional.usecase';
import { OrcadorDeItens } from './use-cases/orcador-de-itens.service';
import { ORDEM_SERVICO_CONSULTA } from './use-cases/ordem-servico-consulta.api';
import { OrdemServicoConsultaService } from './use-cases/ordem-servico-consulta.service';
import { ORDEM_SERVICO_REPOSITORY } from './use-cases/ordem-servico.repositorio';
import { RecusarOrcamento } from './use-cases/recusar-orcamento.usecase';
import { RegistrarDiagnostico } from './use-cases/registrar-diagnostico.usecase';
import { RelatorioTempoMedioExecucao } from './use-cases/relatorio-tempo-medio.usecase';
import { RetomarExecucaoAoReceberPeca } from './use-cases/retomar-execucao.policy';
import { PrismaOrdemServicoRepository } from './adapters/gateways/prisma-ordem-servico.repositorio';
import { AcompanhamentoController } from './adapters/controllers/acompanhamento.controller';
import { OrdensServicoController } from './adapters/controllers/ordens-servico.controller';
import { RelatoriosController } from './adapters/controllers/relatorios.controller';

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
    AlterarStatusDaOrdem,
    IniciarDiagnostico,
    RegistrarDiagnostico,
    AprovarOrcamento,
    RecusarOrcamento,
    ConcluirExecucao,
    LancarOrcamentoAdicional,
    ConfirmarPagamento,
    EntregarVeiculo,
    ConsultarOrdemServico,
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
