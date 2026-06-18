import { Module } from '@nestjs/common';
import { CadastrarCliente } from './aplicacao/cadastrar-cliente.usecase';
import { CadastrarVeiculo } from './aplicacao/cadastrar-veiculo.usecase';
import {
  AtualizarCliente,
  RemoverCliente,
} from './aplicacao/gerenciar-cliente.usecases';
import {
  AtualizarVeiculo,
  RemoverVeiculo,
} from './aplicacao/gerenciar-veiculo.usecases';
import { CLIENTES_VEICULOS_API } from './aplicacao/clientes-veiculos.api';
import { ClientesVeiculosApiService } from './aplicacao/clientes-veiculos-api.service';
import { CLIENTE_REPOSITORY, VEICULO_REPOSITORY } from './dominio/repositorios';
import { PrismaClienteRepository } from './infraestrutura/prisma-cliente.repository';
import { PrismaVeiculoRepository } from './infraestrutura/prisma-veiculo.repository';
import { ClientesController } from './interfaces/clientes.controller';
import { VeiculosController } from './interfaces/veiculos.controller';

/**
 * Contexto Clientes e Veículos. Note o que é exportado: apenas a porta pública
 * CLIENTES_VEICULOS_API (open-host service). Os repositórios e entidades ficam
 * privados ao módulo — é assim que a "regra de ouro" é respeitada: ninguém de
 * fora alcança o estado interno deste contexto.
 */
@Module({
  controllers: [ClientesController, VeiculosController],
  providers: [
    CadastrarCliente,
    CadastrarVeiculo,
    AtualizarCliente,
    RemoverCliente,
    AtualizarVeiculo,
    RemoverVeiculo,
    { provide: CLIENTE_REPOSITORY, useClass: PrismaClienteRepository },
    { provide: VEICULO_REPOSITORY, useClass: PrismaVeiculoRepository },
    { provide: CLIENTES_VEICULOS_API, useClass: ClientesVeiculosApiService },
  ],
  exports: [CLIENTES_VEICULOS_API],
})
export class ClientesVeiculosModule {}
