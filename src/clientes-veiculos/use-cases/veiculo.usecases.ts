import { Inject, Injectable } from '@nestjs/common';
import {
  GERADOR_DE_ID,
  GeradorDeId,
} from '../../compartilhado/dominio/gerador-de-id';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroConflito,
  ErroNaoEncontrado,
} from '../../compartilhado/erros/erros-dominio';
import { Veiculo } from '../entities/veiculo';
import { CLIENTE_REPOSITORY, ClienteRepository } from './cliente.repositorio';
import { VEICULO_REPOSITORY, VeiculoRepository } from './veiculo.repositorio';

export interface EntradaCadastrarVeiculo {
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

export interface EntradaAtualizarVeiculo {
  id: string;
  marca?: string;
  modelo?: string;
  ano?: number;
}

/**
 * Casos de uso do agregado Veículo (CRUD coeso). A validação da placa mora no
 * VO Placa (chamado pela raiz Veículo); aqui ficam as regras que cruzam os
 * repositórios (cliente precisa existir, placa única) e a publicação de eventos.
 */
@Injectable()
export class VeiculoUseCases {
  constructor(
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculos: VeiculoRepository,
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
    @Inject(GERADOR_DE_ID)
    private readonly ids: GeradorDeId,
  ) {}

  async cadastrar(entrada: EntradaCadastrarVeiculo): Promise<Veiculo> {
    const cliente = await this.clientes.buscarPorId(entrada.clienteId);
    if (!cliente || !cliente.ativo) {
      throw new ErroNaoEncontrado('Cliente não encontrado.', {
        clienteId: entrada.clienteId,
      });
    }

    // A raiz valida a placa (formato) ao construir.
    const veiculo = Veiculo.registrar({
      id: this.ids.novo(),
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
    await this.eventos.publicar(...veiculo.puxarEventos());
    return veiculo;
  }

  async atualizar(entrada: EntradaAtualizarVeiculo): Promise<Veiculo> {
    const veiculo = await this.buscarAtivoOuFalhar(entrada.id);
    veiculo.atualizarDados(entrada);
    await this.veiculos.salvar(veiculo);
    return veiculo;
  }

  async remover(id: string): Promise<void> {
    const veiculo = await this.buscarAtivoOuFalhar(id);
    veiculo.inativar();
    await this.veiculos.salvar(veiculo);
  }

  async listarDoCliente(clienteId: string): Promise<Veiculo[]> {
    return this.veiculos.listarPorCliente(clienteId);
  }

  async buscar(id: string): Promise<Veiculo> {
    const veiculo = await this.veiculos.buscarPorId(id);
    if (!veiculo) {
      throw new ErroNaoEncontrado('Veículo não encontrado.', { id });
    }
    return veiculo;
  }

  private async buscarAtivoOuFalhar(id: string): Promise<Veiculo> {
    const veiculo = await this.veiculos.buscarPorId(id);
    if (!veiculo || !veiculo.ativo) {
      throw new ErroNaoEncontrado('Veículo não encontrado.', { id });
    }
    return veiculo;
  }
}
