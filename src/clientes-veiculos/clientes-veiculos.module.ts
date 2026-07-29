import { Module } from '@nestjs/common';
import { ClienteUseCases } from './use-cases/cliente.usecases';
import { VeiculoUseCases } from './use-cases/veiculo.usecases';
import { CLIENTES_VEICULOS_API } from './use-cases/clientes-veiculos.api';
import { ClientesVeiculosApiService } from './use-cases/clientes-veiculos-api.service';
import { CLIENTE_REPOSITORY } from './use-cases/cliente.repositorio';
import { VEICULO_REPOSITORY } from './use-cases/veiculo.repositorio';
import { PrismaClienteRepository } from './adapters/gateways/prisma-cliente.repositorio';
import { PrismaVeiculoRepository } from './adapters/gateways/prisma-veiculo.repositorio';
import { ClientesController } from './adapters/controllers/clientes.controller';
import { VeiculosController } from './adapters/controllers/veiculos.controller';

/**
 * Contexto Clientes e Veículos. Note o que é exportado: apenas a porta pública
 * CLIENTES_VEICULOS_API (open-host service). Os repositórios e entidades ficam
 * privados ao módulo — é assim que a "regra de ouro" é respeitada: ninguém de
 * fora alcança o estado interno deste contexto.
 */
@Module({
  controllers: [ClientesController, VeiculosController],
  providers: [
    ClienteUseCases,
    VeiculoUseCases,
    { provide: CLIENTE_REPOSITORY, useClass: PrismaClienteRepository },
    { provide: VEICULO_REPOSITORY, useClass: PrismaVeiculoRepository },
    { provide: CLIENTES_VEICULOS_API, useClass: ClientesVeiculosApiService },
  ],
  exports: [CLIENTES_VEICULOS_API],
})
export class ClientesVeiculosModule {}
