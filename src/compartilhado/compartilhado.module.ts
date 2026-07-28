import { Global, Module } from '@nestjs/common';
import { PrismaService } from './infraestrutura/prisma/prisma.service';
import { PUBLICADOR_DE_EVENTOS } from './dominio/publicador-de-eventos';
import { EventEmitterPublicador } from './infraestrutura/eventos/event-emitter-publicador';
import { GERADOR_DE_ID } from './dominio/gerador-de-id';
import { UuidGeradorDeId } from './infraestrutura/id/uuid-gerador-de-id';

/**
 * Núcleo compartilhado (shared kernel) do monolito modular.
 * Exporta a conexão única do banco (PrismaService) e o event bus in-process
 * (PUBLICADOR_DE_EVENTOS). As classes-base de entidade/evento e os value
 * objects (Documento, Placa) vivem em `dominio/` e são importados diretamente
 * pelos módulos — sem vazar entidades entre contextos, pois são abstrações.
 *
 * É @Global para que esses recursos transversais fiquem disponíveis aos
 * módulos sem reimportações.
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
