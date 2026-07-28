import { GeradorDeId } from '../../compartilhado/dominio/gerador-de-id';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { Servico } from '../entities/servico';
import { ServicoRepository } from './servico.repositorio';
import { ServicoUseCases } from './servico.usecases';

function createRepositoryMock(): jest.Mocked<ServicoRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    listar: jest.fn(),
  };
}

function createIdGeneratorMock(fixedId = 'id-fixo'): jest.Mocked<GeradorDeId> {
  return { novo: jest.fn().mockReturnValue(fixedId) };
}

function buildScenario(
  repository = createRepositoryMock(),
  idGenerator = createIdGeneratorMock(),
): {
  useCase: ServicoUseCases;
  repository: jest.Mocked<ServicoRepository>;
  idGenerator: jest.Mocked<GeradorDeId>;
} {
  return {
    useCase: new ServicoUseCases(repository, idGenerator),
    repository,
    idGenerator,
  };
}

describe('ServicoUseCases', () => {
  it('cadastra usando o id do gerador (determinístico)', async () => {
    const { useCase, repository, idGenerator } = buildScenario();
    const servico = await useCase.cadastrar({
      nome: 'Troca de óleo',
      precoBase: 120,
    });
    expect(idGenerator.novo).toHaveBeenCalled();
    expect(servico.id).toBe('id-fixo');
    expect(servico.nome).toBe('Troca de óleo');
    expect(repository.inserir).toHaveBeenCalledWith(servico);
  });

  it('atualiza', async () => {
    const { useCase, repository } = buildScenario();
    repository.buscarPorId.mockResolvedValue(
      Servico.criar({ id: 's1', nome: 'X', precoBase: 10 }),
    );
    const servico = await useCase.atualizar({ id: 's1', precoBase: 150 });
    expect(servico.precoBase).toBe(150);
    expect(repository.salvar).toHaveBeenCalled();
  });

  it('remove (soft delete)', async () => {
    const { useCase, repository } = buildScenario();
    const servico = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    repository.buscarPorId.mockResolvedValue(servico);
    await useCase.remover('s1');
    expect(servico.ativo).toBe(false);
    expect(repository.salvar).toHaveBeenCalled();
  });

  it('atualizar falha quando não encontra', async () => {
    const { useCase, repository } = buildScenario();
    repository.buscarPorId.mockResolvedValue(null);
    await expect(
      useCase.atualizar({ id: 'x', nome: 'Y' }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('lista os serviços', async () => {
    const { useCase, repository } = buildScenario();
    const servico = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    repository.listar.mockResolvedValue([servico]);
    expect(await useCase.listar()).toEqual([servico]);
  });

  it('busca por id', async () => {
    const { useCase, repository } = buildScenario();
    const servico = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    repository.buscarPorId.mockResolvedValue(servico);
    expect(await useCase.buscar('s1')).toBe(servico);
  });

  it('buscar falha quando não encontra', async () => {
    const { useCase, repository } = buildScenario();
    repository.buscarPorId.mockResolvedValue(null);
    await expect(useCase.buscar('x')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
