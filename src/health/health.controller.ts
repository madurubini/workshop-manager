import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../compartilhado/infraestrutura/prisma/prisma.service';

/**
 * Sondas de saúde (públicas). A liveness não consulta o banco de propósito: ela
 * reinicia o pod, e uma queda do Postgres derrubaria réplicas sadias em cascata.
 * Quem verifica o banco é a readiness, que só tira o pod do balanceamento.
 */
@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Sonda completa: aplicação no ar e banco acessível',
  })
  verificar() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
    ]);
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness: o processo está vivo (não consulta o banco)',
  })
  vivo() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness: pronto para receber tráfego (banco acessível)',
  })
  pronto() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
    ]);
  }
}
