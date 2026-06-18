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
import { CadastrarCliente } from '../aplicacao/cadastrar-cliente.usecase';
import {
  AtualizarCliente,
  RemoverCliente,
} from '../aplicacao/gerenciar-cliente.usecases';
import { CLIENTE_REPOSITORY, ClienteRepository } from '../dominio/repositorios';
import {
  AtualizarClienteDto,
  ClienteRespostaDto,
  CriarClienteDto,
} from './dtos';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(
    private readonly cadastrarCliente: CadastrarCliente,
    private readonly atualizarCliente: AtualizarCliente,
    private readonly removerCliente: RemoverCliente,
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

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza dados de contato do cliente' })
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarClienteDto,
  ): Promise<ClienteRespostaDto> {
    const cliente = await this.atualizarCliente.executar({ id, ...dto });
    return ClienteRespostaDto.de(cliente);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove o cliente (soft delete)' })
  async remover(@Param('id') id: string): Promise<void> {
    await this.removerCliente.executar({ id });
  }
}
