import { Module } from '@nestjs/common';
import { CatalogoServicosModule } from '../catalogo-servicos/catalogo-servicos.module';
import { ClientesVeiculosModule } from '../clientes-veiculos/clientes-veiculos.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { AbrirOrdemServico } from './aplicacao/abrir-ordem-servico.usecase';
import { RegistrarDiagnostico } from './aplicacao/registrar-diagnostico.usecase';
import { ORDEM_SERVICO_REPOSITORY } from './dominio/repositorios';
import { PrismaOrdemServicoRepository } from './infraestrutura/prisma-ordem-servico.repository';
import { OrdensServicoController } from './interfaces/ordens-servico.controller';

/**
 * Contexto Ordem de Serviço (núcleo). Importa os outros contextos apenas para
 * receber as portas públicas que eles exportam (CLIENTES_VEICULOS_API,
 * CATALOGO_SERVICOS_API, ESTOQUE_API) — nunca seus repositórios ou entidades.
 */
@Module({
  imports: [ClientesVeiculosModule, CatalogoServicosModule, EstoqueModule],
  controllers: [OrdensServicoController],
  providers: [
    AbrirOrdemServico,
    RegistrarDiagnostico,
    {
      provide: ORDEM_SERVICO_REPOSITORY,
      useClass: PrismaOrdemServicoRepository,
    },
  ],
})
export class OrdemServicoModule {}
