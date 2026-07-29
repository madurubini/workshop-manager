import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identidade/adapters/guards/jwt-auth.guard';
import {
  RelatorioTempoMedio,
  RelatorioTempoMedioExecucao,
} from '../aplicacao/relatorio-tempo-medio.usecase';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly tempoMedio: RelatorioTempoMedioExecucao) {}

  @Get('tempo-medio-execucao')
  @ApiOperation({ summary: 'Tempo médio de execução das OS concluídas' })
  @ApiQuery({ name: 'inicio', required: false, description: 'ISO-8601' })
  @ApiQuery({ name: 'fim', required: false, description: 'ISO-8601' })
  async tempoMedioExecucao(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ): Promise<RelatorioTempoMedio> {
    return this.tempoMedio.executar({
      inicio: inicio ? new Date(inicio) : undefined,
      fim: fim ? new Date(fim) : undefined,
    });
  }
}
