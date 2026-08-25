import { Global, Module } from '@nestjs/common';
import { PrismaService } from './infraestrutura/prisma/prisma.service';
import { PUBLICADOR_DE_EVENTOS } from './dominio/publicador-de-eventos';
import { EventEmitterPublicador } from './infraestrutura/eventos/event-emitter-publicador';
import { GERADOR_DE_ID } from './dominio/gerador-de-id';
import { UuidGeradorDeId } from './infraestrutura/id/uuid-gerador-de-id';

/**
 * Shared kernel: conexão única do banco, event bus e gerador de id. É @Global
 * para que os módulos não precisem reimportá-lo.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    { provide: PUBLICADOR_DE_EVENTOS, useClass: EventEmitterPublicador },
    { provide: GERADOR_DE_ID, useClass: UuidGeradorDeId },
  ],
  exports: [PrismaService, PUBLICADOR_DE_EVENTOS, GERADOR_DE_ID],
})
export class CompartilhadoModule {}
