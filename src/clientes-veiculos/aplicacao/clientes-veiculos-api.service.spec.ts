import { Cliente } from '../dominio/cliente';
import { Veiculo } from '../dominio/veiculo';
import { ClienteRepository, VeiculoRepository } from '../dominio/repositorios';
import { ClientesVeiculosApiService } from './clientes-veiculos-api.service';

describe('ClientesVeiculosApiService (porta pública / open-host)', () => {
  let clientes: jest.Mocked<ClienteRepository>;
  let veiculos: jest.Mocked<VeiculoRepository>;
  let api: ClientesVeiculosApiService;

  beforeEach(() => {
    clientes = {
      inserir: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorDocumento: jest.fn(),
      listar: jest.fn(),
    };
    veiculos = {
      inserir: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorPlaca: jest.fn(),
      listarPorCliente: jest.fn(),
    };
    api = new ClientesVeiculosApiService(clientes, veiculos);
  });

  const cliente = Cliente.cadastrar({
    id: 'c1',
    documento: '52998224725',
    nome: 'Maria',
  });

  const veiculoDoCliente = Veiculo.registrar({
    id: 'v1',
    clienteId: 'c1',
    placa: 'ABC1D23',
    marca: 'VW',
    modelo: 'Gol',
    ano: 2020,
  });

  describe('clienteExiste', () => {
    it('verdadeiro para cliente ativo', async () => {
      clientes.buscarPorId.mockResolvedValue(cliente);
      expect(await api.clienteExiste('c1')).toBe(true);
    });

    it('falso quando não existe', async () => {
      clientes.buscarPorId.mockResolvedValue(null);
      expect(await api.clienteExiste('c1')).toBe(false);
    });

    it('falso quando inativo', async () => {
      const inativo = Cliente.cadastrar({
        id: 'c2',
        documento: '11144477735',
        nome: 'João',
      });
      inativo.inativar();
      clientes.buscarPorId.mockResolvedValue(inativo);
      expect(await api.clienteExiste('c2')).toBe(false);
    });
  });

  describe('veiculoPertenceAoCliente', () => {
    it('verdadeiro quando ativo e do cliente', async () => {
      veiculos.buscarPorId.mockResolvedValue(veiculoDoCliente);
      expect(await api.veiculoPertenceAoCliente('v1', 'c1')).toBe(true);
    });

    it('falso quando é de outro cliente', async () => {
      veiculos.buscarPorId.mockResolvedValue(veiculoDoCliente);
      expect(await api.veiculoPertenceAoCliente('v1', 'outro')).toBe(false);
    });

    it('falso quando não existe', async () => {
      veiculos.buscarPorId.mockResolvedValue(null);
      expect(await api.veiculoPertenceAoCliente('v1', 'c1')).toBe(false);
    });
  });
});
