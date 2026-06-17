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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identidade/interfaces/jwt-auth.guard';
import { UsuarioAtual } from '../../identidade/interfaces/usuario-atual.decorator';
import { UsuarioAutenticado } from '../../identidade/infraestrutura/jwt.strategy';
import { AbrirOrdemServico } from '../aplicacao/abrir-ordem-servico.usecase';
import { EnviarOrcamento } from '../aplicacao/enviar-orcamento.usecase';
import { RegistrarDiagnostico } from '../aplicacao/registrar-diagnostico.usecase';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';
import { StatusOS } from '../dominio/status-os';
import {
  AbrirOrdemServicoDto,
  DiagnosticoRespostaDto,
  OrdemServicoRespostaDto,
  RegistrarDiagnosticoDto,
} from './dtos';

@ApiTags('Ordens de Serviço')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly abrirOrdemServico: AbrirOrdemServico,
    private readonly registrarDiagnostico: RegistrarDiagnostico,
    private readonly enviarOrcamento: EnviarOrcamento,
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abre uma OS (status → Recebida)' })
  async abrir(
    @Body() dto: AbrirOrdemServicoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<OrdemServicoRespostaDto> {
    const ordem = await this.abrirOrdemServico.executar({
      ...dto,
      por: usuario.username,
    });
    return OrdemServicoRespostaDto.de(ordem);
  }

  @Get()
  @ApiOperation({ summary: 'Lista/filtra ordens de serviço' })
  @ApiQuery({ name: 'status', required: false, enum: StatusOS })
  @ApiQuery({ name: 'clienteId', required: false })
  async listar(
    @Query('status') status?: StatusOS,
    @Query('clienteId') clienteId?: string,
  ): Promise<OrdemServicoRespostaDto[]> {
    const ordens = await this.ordens.listar({ status, clienteId });
    return ordens.map(OrdemServicoRespostaDto.de);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe completo da OS' })
  async porId(@Param('id') id: string): Promise<OrdemServicoRespostaDto> {
    const ordem = await this.ordens.buscarPorId(id);
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }
    return OrdemServicoRespostaDto.de(ordem);
  }

  @Post(':id/diagnostico')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Registra serviços/peças e conclui o diagnóstico (verifica estoque, cota faltantes, gera orçamento; status → Em diagnóstico)',
  })
  async diagnostico(
    @Param('id') id: string,
    @Body() dto: RegistrarDiagnosticoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<DiagnosticoRespostaDto> {
    const ordem = await this.registrarDiagnostico.executar({
      ordemId: id,
      servicos: dto.servicos,
      pecas: dto.pecas ?? [],
      por: usuario.username,
    });
    return DiagnosticoRespostaDto.de(ordem);
  }

  @Post(':id/orcamento/enviar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Envia o orçamento ao cliente (status → Aguardando aprovação; notifica)',
  })
  async enviar(
    @Param('id') id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<OrdemServicoRespostaDto> {
    const ordem = await this.enviarOrcamento.executar({
      ordemId: id,
      por: usuario.username,
    });
    return OrdemServicoRespostaDto.de(ordem);
  }
}
