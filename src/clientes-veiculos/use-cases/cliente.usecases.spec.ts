import { GeradorDeId } from '../../compartilhado/dominio/gerador-de-id';
import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../entities/cliente';
import { ClienteRepository } from './cliente.repositorio';
import { ClienteUseCases } from './cliente.usecases';

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

function buildScenario(
  repository = createClienteRepositoryMock(),
  events = createEventsPublisherMock(),
  idGenerator = createIdGeneratorMock(),
): {
  useCase: ClienteUseCases;
  repository: jest.Mocked<ClienteRepository>;
  events: jest.Mocked<PublicadorDeEventos>;
  idGenerator: jest.Mocked<GeradorDeId>;
} {
  return {
    useCase: new ClienteUseCases(repository, events, idGenerator),
    repository,
    events,
    idGenerator,
  };
}

function umCliente(): Cliente {
  return Cliente.cadastrar({
    id: 'c1',
    documento: '52998224725',
    nome: 'Maria',
  });
}

describe('ClienteUseCases', () => {
  describe('cadastrar', () => {
    it('cadastra cliente válido com o id do gerador, persiste e publica evento', async () => {
      const { useCase, repository, events, idGenerator } = buildScenario();
      repository.buscarPorDocumento.mockResolvedValue(null);

      const cliente = await useCase.cadastrar({
        documento: '529.982.247-25',
        nome: 'Maria',
      });

      expect(idGenerator.novo).toHaveBeenCalled();
      expect(cliente.id).toBe('id-fixo');
      expect(cliente.documento.valor).toBe('52998224725');
      expect(repository.inserir).toHaveBeenCalledWith(cliente);
      expect(events.publicar).toHaveBeenCalledTimes(1);
    });

    it('rejeita documento inválido antes de tocar o repositório', async () => {
      const { useCase, repository } = buildScenario();
      await expect(
        useCase.cadastrar({ documento: '111', nome: 'Maria' }),
      ).rejects.toBeInstanceOf(ErroValidacao);
      expect(repository.buscarPorDocumento).not.toHaveBeenCalled();
    });

    it('rejeita documento de cliente ATIVO com conflito', async () => {
      const { useCase, repository } = buildScenario();
      repository.buscarPorDocumento.mockResolvedValue(umCliente());

      await expect(
        useCase.cadastrar({ documento: '52998224725', nome: 'Maria' }),
      ).rejects.toBeInstanceOf(ErroConflito);
      expect(repository.inserir).not.toHaveBeenCalled();
    });

    it('recadastra: reativa o cliente INATIVO em vez de criar outro', async () => {
      const { useCase, repository, events } = buildScenario();
      const inativo = umCliente();
      inativo.inativar();
      inativo.puxarEventos(); // limpa o evento do cadastro original
      repository.buscarPorDocumento.mockResolvedValue(inativo);

      const resultado = await useCase.cadastrar({
        documento: '52998224725',
        nome: 'Nova',
        email: 'nova@email.com',
      });

      expect(resultado).toBe(inativo);
      expect(inativo.ativo).toBe(true);
      expect(inativo.nome).toBe('Nova');
      expect(repository.salvar).toHaveBeenCalledWith(inativo);
      expect(repository.inserir).not.toHaveBeenCalled();
      expect(events.publicar).toHaveBeenCalled();
    });
  });

  describe('atualizar / remover / listar / buscar', () => {
    it('atualiza dados e salva', async () => {
      const { useCase, repository } = buildScenario();
      repository.buscarPorId.mockResolvedValue(umCliente());
      const cliente = await useCase.atualizar({
        id: 'c1',
        nome: 'Maria Silva',
        telefone: '119',
      });
      expect(cliente.nome).toBe('Maria Silva');
      expect(cliente.telefone).toBe('119');
      expect(repository.salvar).toHaveBeenCalled();
    });

    it('remove via soft delete', async () => {
      const { useCase, repository } = buildScenario();
      const cliente = umCliente();
      repository.buscarPorId.mockResolvedValue(cliente);
      await useCase.remover('c1');
      expect(cliente.ativo).toBe(false);
      expect(repository.salvar).toHaveBeenCalledWith(cliente);
    });

    it('atualizar falha quando não encontra', async () => {
      const { useCase, repository } = buildScenario();
      repository.buscarPorId.mockResolvedValue(null);
      await expect(
        useCase.atualizar({ id: 'x', nome: 'Y' }),
      ).rejects.toBeInstanceOf(ErroNaoEncontrado);
    });

    it('lista os clientes', async () => {
      const { useCase, repository } = buildScenario();
      const cliente = umCliente();
      repository.listar.mockResolvedValue([cliente]);
      expect(await useCase.listar()).toEqual([cliente]);
    });

    it('busca por id', async () => {
      const { useCase, repository } = buildScenario();
      const cliente = umCliente();
      repository.buscarPorId.mockResolvedValue(cliente);
      expect(await useCase.buscar('c1')).toBe(cliente);
    });

    it('buscar falha quando não encontra', async () => {
      const { useCase, repository } = buildScenario();
      repository.buscarPorId.mockResolvedValue(null);
      await expect(useCase.buscar('x')).rejects.toBeInstanceOf(
        ErroNaoEncontrado,
      );
    });
  });
});
