import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../compartilhado/infraestrutura/prisma/prisma.service';

/**
 * Sondas de saúde da aplicação (públicas). São três, porque o orquestrador faz
 * duas perguntas diferentes e uma resposta só não serve para as duas:
 *
 * - `/health/live`   (liveness)  — "o processo está vivo?". Se falhar, o pod é
 *   REINICIADO. Por isso não toca no banco: uma instabilidade do Postgres não
 *   pode derrubar em cascata réplicas que estão perfeitamente sadias.
 * - `/health/ready`  (readiness) — "posso mandar tráfego?". Se falhar, o pod só
 *   sai do balanceamento até se recuperar. Aqui sim o banco é verificado.
 * - `/health`        — sonda completa, mantida para o Docker Compose e o README.
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
