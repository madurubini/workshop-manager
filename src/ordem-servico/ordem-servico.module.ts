import { Module } from '@nestjs/common';
import { ClientesVeiculosModule } from '../clientes-veiculos/clientes-veiculos.module';
import { AbrirOrdemServico } from './aplicacao/abrir-ordem-servico.usecase';
import { ORDEM_SERVICO_REPOSITORY } from './dominio/repositorios';
import { PrismaOrdemServicoRepository } from './infraestrutura/prisma-ordem-servico.repository';
import { OrdensServicoController } from './interfaces/ordens-servico.controller';

/**
 * Contexto Ordem de Serviço (núcleo). Importa ClientesVeiculosModule apenas
 * para receber a porta pública CLIENTES_VEICULOS_API que aquele módulo exporta
 * — não enxerga repositórios nem entidades de Clientes e Veículos.
 */
@Module({
  imports: [ClientesVeiculosModule],
  controllers: [OrdensServicoController],
  providers: [
    AbrirOrdemServico,
    {
      provide: ORDEM_SERVICO_REPOSITORY,
      useClass: PrismaOrdemServicoRepository,
    },
  ],
})
export class OrdemServicoModule {}
