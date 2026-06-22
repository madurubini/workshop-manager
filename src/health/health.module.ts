import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

/**
 * Módulo de health check (terminus). O PrismaService vem do CompartilhadoModule
 * (@Global), por isso não precisa ser reimportado aqui.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
