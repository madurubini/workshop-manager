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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AcompanhamentoGuard } from '../../identidade/interfaces/acompanhamento.guard';
import { AprovarOrcamento } from '../aplicacao/aprovar-orcamento.usecase';
import { RecusarOrcamento } from '../aplicacao/recusar-orcamento.usecase';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';
import { AcompanhamentoRespostaDto, RespostaOrcamentoDto } from './dtos';

/**
 * Acompanhamento do cliente (app). A CONSULTA (GET) é pública — o acesso é pelo
 * id da OS (o link enviado ao cliente). Já a RESPOSTA ao orçamento (aprovar /
 * recusar) exige o TOKEN DE ACOMPANHAMENTO daquela OS (assinado, com escopo e
 * validade — gerado no envio do orçamento e embutido no link). O cliente aprova
 * pelo app sem ter conta, e o token de uma OS não serve para outra.
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
  @UseGuards(AcompanhamentoGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cliente aprova ou recusa um orçamento via token de acompanhamento da OS (roteia para dois casos de uso)',
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
