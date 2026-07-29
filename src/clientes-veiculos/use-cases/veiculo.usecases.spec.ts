import { GeradorDeId } from '../../compartilhado/dominio/gerador-de-id';
import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../entities/cliente';
import { Veiculo } from '../entities/veiculo';
import { ClienteRepository } from './cliente.repositorio';
import { VeiculoRepository } from './veiculo.repositorio';
import { VeiculoUseCases } from './veiculo.usecases';

function createVeiculoRepositoryMock(): jest.Mocked<VeiculoRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorPlaca: jest.fn(),
    listarPorCliente: jest.fn(),
  };
}

function createClienteRepositoryMock(): jest.Mocked<ClienteRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorDocumento: jest.fn(),
    listar: jest.fn(),
  };
}

function createEventsPublisherMock(): jest.Mocked<PublicadorDeEventos> {
  return { publicar: jest.fn() };
}

function createIdGeneratorMock(fixedId = 'id-fixo'): jest.Mocked<GeradorDeId> {
  return { novo: jest.fn().mockReturnValue(fixedId) };
}

function buildScenario(): {
  useCase: VeiculoUseCases;
  veiculoRepository: jest.Mocked<VeiculoRepository>;
  clienteRepository: jest.Mocked<ClienteRepository>;
  events: jest.Mocked<PublicadorDeEventos>;
  idGenerator: jest.Mocked<GeradorDeId>;
} {
  const veiculoRepository = createVeiculoRepositoryMock();
  const clienteRepository = createClienteRepositoryMock();
  const events = createEventsPublisherMock();
  const idGenerator = createIdGeneratorMock();
  return {
    useCase: new VeiculoUseCases(
      veiculoRepository,
      clienteRepository,
      events,
      idGenerator,
    ),
    veiculoRepository,
    clienteRepository,
    events,
    idGenerator,
  };
}

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

describe('VeiculoUseCases', () => {
  describe('cadastrar', () => {
    it('cadastra veículo válido para cliente existente e publica evento', async () => {
      const { useCase, veiculoRepository, clienteRepository, events } =
        buildScenario();
      clienteRepository.buscarPorId.mockResolvedValue(clienteAtivo);
      veiculoRepository.buscarPorPlaca.mockResolvedValue(null);

      const veiculo = await useCase.cadastrar(entradaValida);

      expect(veiculo.id).toBe('id-fixo');
      expect(veiculo.placa.valor).toBe('ABC1D23');
      expect(veiculoRepository.inserir).toHaveBeenCalledWith(veiculo);
      expect(events.publicar).toHaveBeenCalledTimes(1);
    });

    it('rejeita quando o cliente não existe', async () => {
      const { useCase, veiculoRepository, clienteRepository } = buildScenario();
      clienteRepository.buscarPorId.mockResolvedValue(null);

      await expect(useCase.cadastrar(entradaValida)).rejects.toBeInstanceOf(
        ErroNaoEncontrado,
      );
      expect(veiculoRepository.inserir).not.toHaveBeenCalled();
    });

    it('rejeita placa inválida', async () => {
      const { useCase, clienteRepository } = buildScenario();
      clienteRepository.buscarPorId.mockResolvedValue(clienteAtivo);

      await expect(
        useCase.cadastrar({ ...entradaValida, placa: 'XX' }),
      ).rejects.toBeInstanceOf(ErroValidacao);
    });

    it('rejeita placa duplicada com conflito', async () => {
      const { useCase, veiculoRepository, clienteRepository } = buildScenario();
      clienteRepository.buscarPorId.mockResolvedValue(clienteAtivo);
      veiculoRepository.buscarPorPlaca.mockResolvedValue({} as Veiculo);

      await expect(useCase.cadastrar(entradaValida)).rejects.toBeInstanceOf(
        ErroConflito,
      );
      expect(veiculoRepository.inserir).not.toHaveBeenCalled();
    });
  });

  describe('atualizar / remover / listar / buscar', () => {
    it('atualiza marca/modelo/ano e salva', async () => {
      const { useCase, veiculoRepository } = buildScenario();
      veiculoRepository.buscarPorId.mockResolvedValue(umVeiculo());
      const veiculo = await useCase.atualizar({
        id: 'v1',
        modelo: 'Gol GTI',
        ano: 2021,
      });
      expect(veiculo.modelo).toBe('Gol GTI');
      expect(veiculo.ano).toBe(2021);
      expect(veiculoRepository.salvar).toHaveBeenCalled();
    });

    it('remove via soft delete', async () => {
      const { useCase, veiculoRepository } = buildScenario();
      const veiculo = umVeiculo();
      veiculoRepository.buscarPorId.mockResolvedValue(veiculo);
      await useCase.remover('v1');
      expect(veiculo.ativo).toBe(false);
    });

    it('remover falha quando não encontra', async () => {
      const { useCase, veiculoRepository } = buildScenario();
      veiculoRepository.buscarPorId.mockResolvedValue(null);
      await expect(useCase.remover('x')).rejects.toBeInstanceOf(
        ErroNaoEncontrado,
      );
    });

    it('lista os veículos do cliente', async () => {
      const { useCase, veiculoRepository } = buildScenario();
      const veiculo = umVeiculo();
      veiculoRepository.listarPorCliente.mockResolvedValue([veiculo]);
      expect(await useCase.listarDoCliente('c1')).toEqual([veiculo]);
    });

    it('busca por id', async () => {
      const { useCase, veiculoRepository } = buildScenario();
      const veiculo = umVeiculo();
      veiculoRepository.buscarPorId.mockResolvedValue(veiculo);
      expect(await useCase.buscar('v1')).toBe(veiculo);
    });

    it('buscar falha quando não encontra', async () => {
      const { useCase, veiculoRepository } = buildScenario();
      veiculoRepository.buscarPorId.mockResolvedValue(null);
      await expect(useCase.buscar('x')).rejects.toBeInstanceOf(
        ErroNaoEncontrado,
      );
    });
  });
});
