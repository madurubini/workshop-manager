import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identidade/interfaces/jwt-auth.guard';
import {
  AtualizarServico,
  CadastrarServico,
  RemoverServico,
} from '../aplicacao/servico-crud.usecases';
import { SERVICO_REPOSITORY, ServicoRepository } from '../dominio/repositorio';
import {
  AtualizarServicoDto,
  CriarServicoDto,
  ServicoRespostaDto,
} from './dtos';

@ApiTags('Serviços (catálogo)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servicos')
export class ServicosController {
  constructor(
    private readonly cadastrar: CadastrarServico,
    private readonly atualizar: AtualizarServico,
    private readonly remover: RemoverServico,
    @Inject(SERVICO_REPOSITORY)
    private readonly servicos: ServicoRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um serviço' })
  async criar(@Body() dto: CriarServicoDto): Promise<ServicoRespostaDto> {
    return ServicoRespostaDto.de(await this.cadastrar.executar(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Lista os serviços ativos' })
  async listar(): Promise<ServicoRespostaDto[]> {
    return (await this.servicos.listar()).map(ServicoRespostaDto.de);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um serviço' })
  async porId(@Param('id') id: string): Promise<ServicoRespostaDto> {
    const servico = await this.servicos.buscarPorId(id);
    if (!servico) {
      throw new NotFoundException('Serviço não encontrado.');
    }
    return ServicoRespostaDto.de(servico);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um serviço' })
  async editar(
    @Param('id') id: string,
    @Body() dto: AtualizarServicoDto,
  ): Promise<ServicoRespostaDto> {
    return ServicoRespostaDto.de(await this.atualizar.executar({ id, ...dto }));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um serviço (soft delete)' })
  async excluir(@Param('id') id: string): Promise<void> {
    await this.remover.executar({ id });
  }
}
