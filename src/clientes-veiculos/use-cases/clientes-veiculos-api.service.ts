import { Inject, Injectable } from '@nestjs/common';
import { ClientesVeiculosApi } from './clientes-veiculos.api';
import { CLIENTE_REPOSITORY, ClienteRepository } from './cliente.repositorio';
import { VEICULO_REPOSITORY, VeiculoRepository } from './veiculo.repositorio';

/**
 * Implementação do open-host service. Traduz consultas externas em buscas nos
 * repositórios internos, devolvendo apenas respostas simples (booleanos) —
 * sem expor entidades para fora do módulo.
 */
@Injectable()
export class ClientesVeiculosApiService implements ClientesVeiculosApi {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculos: VeiculoRepository,
  ) {}

  async clienteExiste(clienteId: string): Promise<boolean> {
    const cliente = await this.clientes.buscarPorId(clienteId);
    return !!cliente && cliente.ativo;
  }

  async veiculoPertenceAoCliente(
    veiculoId: string,
    clienteId: string,
  ): Promise<boolean> {
    const veiculo = await this.veiculos.buscarPorId(veiculoId);
    return !!veiculo && veiculo.ativo && veiculo.clienteId === clienteId;
  }
}
