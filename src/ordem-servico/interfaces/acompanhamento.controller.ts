import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AprovarOrcamento } from '../aplicacao/aprovar-orcamento.usecase';
import { RecusarOrcamento } from '../aplicacao/recusar-orcamento.usecase';
import {
  AprovarReparoAdicional,
  RecusarReparoAdicional,
} from '../aplicacao/responder-reparo.usecases';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';
import {
  AcompanhamentoRespostaDto,
  RespostaOrcamentoDto,
  RespostaReparoDto,
} from './dtos';

/**
 * Acompanhamento do cliente (app). Rotas PÚBLICAS — sem JWT: o acesso é pelo id
 * da OS (o link enviado ao cliente funciona como token da OS, no MVP).
 *
 * O endpoint de resposta ao orçamento roteia para DOIS casos de uso distintos
 * (Aprovar / Recusar) conforme `{ aprovado }`, como pede o contrato.
 */
@ApiTags('Acompanhamento do cliente')
@Controller('acompanhamento')
export class AcompanhamentoController {
  constructor(
    private readonly aprovarOrcamento: AprovarOrcamento,
    private readonly recusarOrcamento: RecusarOrcamento,
    private readonly aprovarReparo: AprovarReparoAdicional,
    private readonly recusarReparo: RecusarReparoAdicional,
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
  ) {}

  @Get(':osId')
  @ApiOperation({ summary: 'Consulta pública: status, orçamento e histórico' })
  async consultar(
    @Param('osId') osId: string,
  ): Promise<AcompanhamentoRespostaDto> {
    const ordem = await this.ordens.buscarPorId(osId);
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }
    return AcompanhamentoRespostaDto.de(ordem);
  }

  @Post(':osId/orcamento/resposta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cliente aprova ou recusa o orçamento (roteia para dois casos de uso)',
  })
  async responder(
    @Param('osId') osId: string,
    @Body() dto: RespostaOrcamentoDto,
  ): Promise<AcompanhamentoRespostaDto> {
    const ordem = dto.aprovado
      ? await this.aprovarOrcamento.executar({ ordemId: osId, por: 'cliente' })
      : await this.recusarOrcamento.executar({
          ordemId: osId,
          justificativa: dto.justificativa,
          por: 'cliente',
        });
    return AcompanhamentoRespostaDto.de(ordem);
  }

  @Post(':osId/reparos-adicionais/:reparoId/resposta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cliente autoriza ou recusa um reparo adicional',
  })
  async responderReparo(
    @Param('osId') osId: string,
    @Param('reparoId') reparoId: string,
    @Body() dto: RespostaReparoDto,
  ): Promise<AcompanhamentoRespostaDto> {
    const ordem = dto.aprovado
      ? await this.aprovarReparo.executar({ ordemId: osId, reparoId })
      : await this.recusarReparo.executar({ ordemId: osId, reparoId });
    return AcompanhamentoRespostaDto.de(ordem);
  }
}
