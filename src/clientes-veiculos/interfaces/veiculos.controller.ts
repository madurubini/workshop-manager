import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identidade/interfaces/jwt-auth.guard';
import { CadastrarVeiculo } from '../aplicacao/cadastrar-veiculo.usecase';
import { VEICULO_REPOSITORY, VeiculoRepository } from '../dominio/repositorios';
import { CriarVeiculoDto, VeiculoRespostaDto } from './dtos';

@ApiTags('Veículos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class VeiculosController {
  constructor(
    private readonly cadastrarVeiculo: CadastrarVeiculo,
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculos: VeiculoRepository,
  ) {}

  @Post('clientes/:clienteId/veiculos')
  @ApiOperation({ summary: 'Cadastra um veículo para o cliente (placa única)' })
  async criar(
    @Param('clienteId') clienteId: string,
    @Body() dto: CriarVeiculoDto,
  ): Promise<VeiculoRespostaDto> {
    const veiculo = await this.cadastrarVeiculo.executar({
      clienteId,
      ...dto,
    });
    return VeiculoRespostaDto.de(veiculo);
  }

  @Get('clientes/:clienteId/veiculos')
  @ApiOperation({ summary: 'Lista os veículos de um cliente' })
  async listarDoCliente(
    @Param('clienteId') clienteId: string,
  ): Promise<VeiculoRespostaDto[]> {
    const veiculos = await this.veiculos.listarPorCliente(clienteId);
    return veiculos.map(VeiculoRespostaDto.de);
  }

  @Get('veiculos/:id')
  @ApiOperation({ summary: 'Detalha um veículo' })
  async porId(@Param('id') id: string): Promise<VeiculoRespostaDto> {
    const veiculo = await this.veiculos.buscarPorId(id);
    if (!veiculo) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    return VeiculoRespostaDto.de(veiculo);
  }
}
