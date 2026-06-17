import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CompartilhadoModule } from './compartilhado/compartilhado.module';
import { IdentidadeModule } from './identidade/identidade.module';
import { ClientesVeiculosModule } from './clientes-veiculos/clientes-veiculos.module';
import { OrdemServicoModule } from './ordem-servico/ordem-servico.module';
import { CatalogoServicosModule } from './catalogo-servicos/catalogo-servicos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';

/**
 * Composição raiz do monolito modular. Cada contexto delimitado entra como
 * um módulo. O event bus in-process (@nestjs/event-emitter) é registrado aqui
 * e será usado pelas políticas entre módulos a partir da Fase 3.
 *
 * Todos os contextos delimitados estão registrados aqui. O ScheduleModule
 * habilita o reenvio periódico de notificações (cliente sem resposta).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CompartilhadoModule,
    IdentidadeModule,
    ClientesVeiculosModule,
    CatalogoServicosModule,
    EstoqueModule,
    OrdemServicoModule,
    NotificacoesModule,
  ],
})
export class AppModule {}
