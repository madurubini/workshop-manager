import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../dominio/cliente';
import { Veiculo } from '../dominio/veiculo';
import { ClienteRepository, VeiculoRepository } from '../dominio/repositorios';
import { CadastrarVeiculo } from './cadastrar-veiculo.usecase';

describe('CadastrarVeiculo', () => {
  let veiculos: jest.Mocked<VeiculoRepository>;
  let clientes: jest.Mocked<ClienteRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let usecase: CadastrarVeiculo;

  const clienteAtivo = Cliente.cadastrar({
    id: 'c1',
    documento: '52998224725',
    nome: 'Maria',
  });

  const entradaValida = {
    clienteId: 'c1',
    placa: 'ABC1D23',
    marca: 'VW',
    modelo: 'Gol',
    ano: 2020,
  };

  beforeEach(() => {
    veiculos = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorPlaca: jest.fn(),
      listarPorCliente: jest.fn(),
    };
    clientes = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorDocumento: jest.fn(),
      listar: jest.fn(),
    };
    eventos = { publicar: jest.fn() };
    usecase = new CadastrarVeiculo(veiculos, clientes, eventos);
  });

  it('cadastra veículo válido para cliente existente e publica evento', async () => {
    clientes.buscarPorId.mockResolvedValue(clienteAtivo);
    veiculos.buscarPorPlaca.mockResolvedValue(null);

    const veiculo = await usecase.executar(entradaValida);

    expect(veiculo).toBeInstanceOf(Veiculo);
    expect(veiculo.placa.valor).toBe('ABC1D23');
    expect(veiculos.inserir).toHaveBeenCalledWith(veiculo);
    expect(eventos.publicar).toHaveBeenCalledTimes(1);
  });

  it('rejeita quando o cliente não existe', async () => {
    clientes.buscarPorId.mockResolvedValue(null);

    await expect(usecase.executar(entradaValida)).rejects.toBeInstanceOf(
      ErroNaoEncontrado,
    );
    expect(veiculos.inserir).not.toHaveBeenCalled();
  });

  it('rejeita placa inválida', async () => {
    clientes.buscarPorId.mockResolvedValue(clienteAtivo);

    await expect(
      usecase.executar({ ...entradaValida, placa: 'XX' }),
    ).rejects.toBeInstanceOf(ErroValidacao);
  });

  it('rejeita placa duplicada com conflito', async () => {
    clientes.buscarPorId.mockResolvedValue(clienteAtivo);
    veiculos.buscarPorPlaca.mockResolvedValue({} as Veiculo);

    await expect(usecase.executar(entradaValida)).rejects.toBeInstanceOf(
      ErroConflito,
    );
    expect(veiculos.inserir).not.toHaveBeenCalled();
  });
});
