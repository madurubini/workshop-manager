import { Global, Module } from '@nestjs/common';
import { PrismaService } from './infraestrutura/prisma/prisma.service';

/**
 * Núcleo compartilhado (shared kernel) do monolito modular.
 * Por enquanto exporta o PrismaService; na Fase 2 ganha as classes-base de
 * entidade/evento, os value objects (CPF/CNPJ, Placa) e o event bus.
 *
 * É @Global para que a conexão única do banco fique disponível aos
 * repositórios de cada módulo sem reimportações — sem vazar entidades entre
 * contextos, pois cada módulo só usa seus próprios repositórios.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CompartilhadoModule {}
