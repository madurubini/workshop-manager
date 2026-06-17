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
import { CadastrarCliente } from '../aplicacao/cadastrar-cliente.usecase';
import { CLIENTE_REPOSITORY, ClienteRepository } from '../dominio/repositorios';
import { ClienteRespostaDto, CriarClienteDto } from './dtos';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(
    private readonly cadastrarCliente: CadastrarCliente,
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um cliente (valida CPF/CNPJ, único)' })
  async criar(@Body() dto: CriarClienteDto): Promise<ClienteRespostaDto> {
    const cliente = await this.cadastrarCliente.executar(dto);
    return ClienteRespostaDto.de(cliente);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os clientes' })
  async listar(): Promise<ClienteRespostaDto[]> {
    const clientes = await this.clientes.listar();
    return clientes.map(ClienteRespostaDto.de);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cliente' })
  async porId(@Param('id') id: string): Promise<ClienteRespostaDto> {
    const cliente = await this.clientes.buscarPorId(id);
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return ClienteRespostaDto.de(cliente);
  }
}
