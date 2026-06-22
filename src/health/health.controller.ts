import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../compartilhado/infraestrutura/prisma/prisma.service';

/**
 * Sonda de saúde da aplicação (pública). Responde 200 quando o app está no ar
 * e o banco está acessível; 503 caso contrário. É o que o Docker (e qualquer
 * orquestrador) consulta para decidir se o container está pronto/saudável.
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
    summary: 'Liveness/readiness: aplicação no ar e banco acessível',
  })
  verificar() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
    ]);
  }
}
