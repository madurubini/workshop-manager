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
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';
import { AcompanhamentoRespostaDto, RespostaOrcamentoDto } from './dtos';

/**
 * Acompanhamento do cliente (app). Rotas PÚBLICAS — sem JWT: o acesso é pelo id
 * da OS (o link enviado ao cliente funciona como token da OS, no MVP).
 *
 * O cliente responde a CADA orçamento pelo id (o inicial e os adicionais usam o
 * mesmo endpoint). O controller roteia para DOIS casos de uso distintos
 * (Aprovar / Recusar) conforme `{ aprovado }`, como pede o contrato.
 */
@ApiTags('Acompanhamento do cliente')
@Controller('acompanhamento')
export class AcompanhamentoController {
  constructor(
    private readonly aprovarOrcamento: AprovarOrcamento,
    private readonly recusarOrcamento: RecusarOrcamento,
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
  ) {}

  @Get(':osId')
  @ApiOperation({ summary: 'Consulta pública: status, orçamentos e histórico' })
  async consultar(
    @Param('osId') osId: string,
  ): Promise<AcompanhamentoRespostaDto> {
    const ordem = await this.ordens.buscarPorId(osId);
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }
    return AcompanhamentoRespostaDto.de(ordem);
  }

  @Post(':osId/orcamentos/:orcamentoId/resposta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cliente aprova ou recusa um orçamento (inicial ou adicional; roteia para dois casos de uso)',
  })
  async responder(
    @Param('osId') osId: string,
    @Param('orcamentoId') orcamentoId: string,
    @Body() dto: RespostaOrcamentoDto,
  ): Promise<AcompanhamentoRespostaDto> {
    const ordem = dto.aprovado
      ? await this.aprovarOrcamento.executar({
          ordemId: osId,
          orcamentoId,
          por: 'cliente',
        })
      : await this.recusarOrcamento.executar({
          ordemId: osId,
          orcamentoId,
          justificativa: dto.justificativa,
          por: 'cliente',
        });
    return AcompanhamentoRespostaDto.de(ordem);
  }
}
