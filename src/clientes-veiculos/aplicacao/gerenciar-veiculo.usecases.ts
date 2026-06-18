import { Inject, Injectable } from '@nestjs/common';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { Veiculo } from '../dominio/veiculo';
import { VEICULO_REPOSITORY, VeiculoRepository } from '../dominio/repositorios';

async function carregar(repo: VeiculoRepository, id: string): Promise<Veiculo> {
  const veiculo = await repo.buscarPorId(id);
  if (!veiculo || !veiculo.ativo) {
    throw new ErroNaoEncontrado('Veículo não encontrado.', { id });
  }
  return veiculo;
}

/** Atualiza marca/modelo/ano do veículo (placa é imutável). */
@Injectable()
export class AtualizarVeiculo {
  constructor(
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculos: VeiculoRepository,
  ) {}

  async executar(entrada: {
    id: string;
    marca?: string;
    modelo?: string;
    ano?: number;
  }): Promise<Veiculo> {
    const veiculo = await carregar(this.veiculos, entrada.id);
    veiculo.atualizarDados(entrada);
    await this.veiculos.salvar(veiculo);
    return veiculo;
  }
}

/** Remove o veículo via soft delete (ativo = false). */
@Injectable()
export class RemoverVeiculo {
  constructor(
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculos: VeiculoRepository,
  ) {}

  async executar(entrada: { id: string }): Promise<void> {
    const veiculo = await carregar(this.veiculos, entrada.id);
    veiculo.inativar();
    await this.veiculos.salvar(veiculo);
  }
}
