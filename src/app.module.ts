import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CompartilhadoModule } from './compartilhado/compartilhado.module';
import { HealthModule } from './health/health.module';
import { IdentidadeModule } from './identidade/identidade.module';
import { ClientesVeiculosModule } from './clientes-veiculos/clientes-veiculos.module';
import { OrdemServicoModule } from './ordem-servico/ordem-servico.module';
import { CatalogoServicosModule } from './catalogo-servicos/catalogo-servicos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';

/**
 * Composição raiz: um módulo por contexto delimitado. O ScheduleModule
 * habilita o reenvio periódico de notificações.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CompartilhadoModule,
    HealthModule,
    IdentidadeModule,
    ClientesVeiculosModule,
    CatalogoServicosModule,
    EstoqueModule,
    OrdemServicoModule,
    NotificacoesModule,
  ],
})
export class AppModule {}
