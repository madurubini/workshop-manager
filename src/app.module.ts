import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CompartilhadoModule } from './compartilhado/compartilhado.module';
import { IdentidadeModule } from './identidade/identidade.module';

/**
 * Composição raiz do monolito modular. Cada contexto delimitado entra como
 * um módulo. O event bus in-process (@nestjs/event-emitter) é registrado aqui
 * e será usado pelas políticas entre módulos a partir da Fase 3.
 *
 * Módulos de domínio (clientes-veiculos, ordem-servico, estoque,
 * catalogo-servicos, notificacoes) entram nas fases seguintes.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    CompartilhadoModule,
    IdentidadeModule,
  ],
})
export class AppModule {}
