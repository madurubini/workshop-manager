import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identidade/adapters/guards/jwt-auth.guard';
import {
  RelatorioTempoMedio,
  RelatorioTempoMedioExecucao,
} from '../../use-cases/relatorio-tempo-medio.usecase';
import { PeriodoRelatorioDto } from '../dtos';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly tempoMedio: RelatorioTempoMedioExecucao) {}

  @Get('tempo-medio-execucao')
  @ApiOperation({
    summary:
      'Tempo médio de execução das OS concluídas, com recorte opcional por data',
  })
  async tempoMedioExecucao(
    @Query() periodo: PeriodoRelatorioDto,
  ): Promise<RelatorioTempoMedio> {
    return this.tempoMedio.executar({
      inicio: periodo.inicio ? new Date(periodo.inicio) : undefined,
      fim: periodo.fim ? new Date(periodo.fim) : undefined,
    });
  }
}
