import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../dominio/cliente';
import { Veiculo } from '../dominio/veiculo';
import { ClienteRepository, VeiculoRepository } from '../dominio/repositorios';
import { AtualizarCliente, RemoverCliente } from './gerenciar-cliente.usecases';
import { AtualizarVeiculo, RemoverVeiculo } from './gerenciar-veiculo.usecases';

function clienteRepo(): jest.Mocked<ClienteRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorDocumento: jest.fn(),
    listar: jest.fn(),
  };
}

function veiculoRepo(): jest.Mocked<VeiculoRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorPlaca: jest.fn(),
    listarPorCliente: jest.fn(),
  };
}

function umCliente(): Cliente {
  return Cliente.cadastrar({
    id: 'c1',
    documento: '52998224725',
    nome: 'Maria',
  });
}

function umVeiculo(): Veiculo {
  return Veiculo.registrar({
    id: 'v1',
    clienteId: 'c1',
    placa: 'ABC1234',
    marca: 'VW',
    modelo: 'Gol',
    ano: 2020,
  });
}

describe('Gerenciar cliente', () => {
  it('atualiza dados e salva', async () => {
    const repo = clienteRepo();
    repo.buscarPorId.mockResolvedValue(umCliente());
    const cliente = await new AtualizarCliente(repo).executar({
      id: 'c1',
      nome: 'Maria Silva',
      telefone: '119',
    });
    expect(cliente.nome).toBe('Maria Silva');
    expect(cliente.telefone).toBe('119');
    expect(repo.salvar).toHaveBeenCalled();
  });

  it('remove via soft delete', async () => {
    const repo = clienteRepo();
    const c = umCliente();
    repo.buscarPorId.mockResolvedValue(c);
    await new RemoverCliente(repo).executar({ id: 'c1' });
    expect(c.ativo).toBe(false);
    expect(repo.salvar).toHaveBeenCalledWith(c);
  });

  it('falha quando não encontra', async () => {
    const repo = clienteRepo();
    repo.buscarPorId.mockResolvedValue(null);
    await expect(
      new AtualizarCliente(repo).executar({ id: 'x', nome: 'Y' }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});

describe('Gerenciar veículo', () => {
  it('atualiza marca/modelo/ano e salva', async () => {
    const repo = veiculoRepo();
    repo.buscarPorId.mockResolvedValue(umVeiculo());
    const v = await new AtualizarVeiculo(repo).executar({
      id: 'v1',
      modelo: 'Gol GTI',
      ano: 2021,
    });
    expect(v.modelo).toBe('Gol GTI');
    expect(v.ano).toBe(2021);
    expect(repo.salvar).toHaveBeenCalled();
  });

  it('remove via soft delete', async () => {
    const repo = veiculoRepo();
    const v = umVeiculo();
    repo.buscarPorId.mockResolvedValue(v);
    await new RemoverVeiculo(repo).executar({ id: 'v1' });
    expect(v.ativo).toBe(false);
  });

  it('falha quando não encontra', async () => {
    const repo = veiculoRepo();
    repo.buscarPorId.mockResolvedValue(null);
    await expect(
      new RemoverVeiculo(repo).executar({ id: 'x' }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
