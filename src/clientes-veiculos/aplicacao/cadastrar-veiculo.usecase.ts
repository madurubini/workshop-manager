import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroConflito,
  ErroNaoEncontrado,
} from '../../compartilhado/erros/erros-dominio';
import { Veiculo } from '../dominio/veiculo';
import {
  CLIENTE_REPOSITORY,
  ClienteRepository,
  VEICULO_REPOSITORY,
  VeiculoRepository,
} from '../dominio/repositorios';

export interface EntradaCadastrarVeiculo {
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

/**
 * Caso de uso: cadastrar um veículo vinculado a um cliente. Garante que o
 * cliente existe (e está ativo) e a unicidade da placa. A validação da placa
 * em si mora no VO Placa (chamado pela raiz Veículo).
 */
@Injectable()
export class CadastrarVeiculo {
  constructor(
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculos: VeiculoRepository,
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: EntradaCadastrarVeiculo): Promise<Veiculo> {
    const cliente = await this.clientes.buscarPorId(entrada.clienteId);
    if (!cliente || !cliente.ativo) {
      throw new ErroNaoEncontrado('Cliente não encontrado.', {
        clienteId: entrada.clienteId,
      });
    }

    // A raiz valida a placa (formato) ao construir.
    const veiculo = Veiculo.registrar({
      id: randomUUID(),
      clienteId: entrada.clienteId,
      placa: entrada.placa,
      marca: entrada.marca,
      modelo: entrada.modelo,
      ano: entrada.ano,
    });

    const jaExiste = await this.veiculos.buscarPorPlaca(veiculo.placa.valor);
    if (jaExiste) {
      throw new ErroConflito('Já existe um veículo com esta placa.', {
        placa: veiculo.placa.valor,
      });
    }

    await this.veiculos.inserir(veiculo);
    this.eventos.publicar(...veiculo.puxarEventos());
    return veiculo;
  }
}
