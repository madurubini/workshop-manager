import { GeradorDeId } from '../../compartilhado/dominio/gerador-de-id';
import {
  ErroConflito,
  ErroNaoEncontrado,
} from '../../compartilhado/erros/erros-dominio';
import { Peca } from '../entities/peca';
import { AtenderEncomendasDaPeca } from './atender-encomendas.service';
import { PecaRepository } from './peca.repositorio';
import { PecaUseCases } from './peca.usecases';

function createPecaRepositoryMock(): jest.Mocked<PecaRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorCodigo: jest.fn(),
    reservarAtomico: jest.fn(),
    listar: jest.fn(),
  };
}

function createIdGeneratorMock(fixedId = 'id-fixo'): jest.Mocked<GeradorDeId> {
  return { novo: jest.fn().mockReturnValue(fixedId) };
}

function createAtenderEncomendasMock(): jest.Mocked<
  Pick<AtenderEncomendasDaPeca, 'executar'>
> {
  return { executar: jest.fn() };
}

function buildScenario(): {
  useCase: PecaUseCases;
  repository: jest.Mocked<PecaRepository>;
  idGenerator: jest.Mocked<GeradorDeId>;
  atenderEncomendas: jest.Mocked<Pick<AtenderEncomendasDaPeca, 'executar'>>;
} {
  const repository = createPecaRepositoryMock();
  const idGenerator = createIdGeneratorMock();
  const atenderEncomendas = createAtenderEncomendasMock();
  return {
    useCase: new PecaUseCases(
      repository,
      idGenerator,
      atenderEncomendas as unknown as AtenderEncomendasDaPeca,
    ),
    repository,
    idGenerator,
    atenderEncomendas,
  };
}

function umaPeca(saldo = 10): Peca {
  return Peca.restaurar('p1', {
    codigo: 'FILTRO',
    nome: 'Filtro',
    precoUnitario: 35,
    saldoFisico: saldo,
    reservado: 0,
    ativo: true,
  });
}

describe('PecaUseCases', () => {
  it('cadastra com o id do gerador quando o código é único', async () => {
    const { useCase, repository, idGenerator } = buildScenario();
    repository.buscarPorCodigo.mockResolvedValue(null);
    const peca = await useCase.cadastrar({
      codigo: 'FILTRO',
      nome: 'Filtro',
      precoUnitario: 35,
      saldoFisico: 5,
    });
    expect(idGenerator.novo).toHaveBeenCalled();
    expect(peca.id).toBe('id-fixo');
    expect(peca.codigo).toBe('FILTRO');
    expect(repository.inserir).toHaveBeenCalledWith(peca);
  });

  it('rejeita código duplicado', async () => {
    const { useCase, repository } = buildScenario();
    repository.buscarPorCodigo.mockResolvedValue(umaPeca());
    await expect(
      useCase.cadastrar({
        codigo: 'FILTRO',
        nome: 'Filtro',
        precoUnitario: 35,
      }),
    ).rejects.toBeInstanceOf(ErroConflito);
    expect(repository.inserir).not.toHaveBeenCalled();
  });

  it('atualiza nome/preço', async () => {
    const { useCase, repository } = buildScenario();
    repository.buscarPorId.mockResolvedValue(umaPeca());
    const peca = await useCase.atualizar({ id: 'p1', precoUnitario: 40 });
    expect(peca.precoUnitario).toBe(40);
    expect(repository.salvar).toHaveBeenCalled();
  });

  it('remove (soft delete)', async () => {
    const { useCase, repository } = buildScenario();
    const peca = umaPeca();
    repository.buscarPorId.mockResolvedValue(peca);
    await useCase.remover('p1');
    expect(peca.ativo).toBe(false);
  });

  it('ajusta estoque (entrada) e atende as encomendas da peça', async () => {
    const { useCase, repository, atenderEncomendas } = buildScenario();
    repository.buscarPorId.mockResolvedValue(umaPeca(10));
    const peca = await useCase.ajustarEstoque({
      id: 'p1',
      tipo: 'ENTRADA',
      quantidade: 5,
    });
    expect(peca.saldoFisico).toBe(15);
    expect(atenderEncomendas.executar).toHaveBeenCalledWith('p1');
  });

  it('ajuste de saída não tenta atender encomendas', async () => {
    const { useCase, repository, atenderEncomendas } = buildScenario();
    repository.buscarPorId.mockResolvedValue(umaPeca(10));
    await useCase.ajustarEstoque({ id: 'p1', tipo: 'SAIDA', quantidade: 3 });
    expect(atenderEncomendas.executar).not.toHaveBeenCalled();
  });

  it('ajuste falha quando não encontra a peça', async () => {
    const { useCase, repository } = buildScenario();
    repository.buscarPorId.mockResolvedValue(null);
    await expect(
      useCase.ajustarEstoque({ id: 'x', tipo: 'SAIDA', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('lista as peças', async () => {
    const { useCase, repository } = buildScenario();
    const peca = umaPeca();
    repository.listar.mockResolvedValue([peca]);
    expect(await useCase.listar()).toEqual([peca]);
  });

  it('busca por id', async () => {
    const { useCase, repository } = buildScenario();
    const peca = umaPeca();
    repository.buscarPorId.mockResolvedValue(peca);
    expect(await useCase.buscar('p1')).toBe(peca);
  });

  it('buscar falha quando não encontra', async () => {
    const { useCase, repository } = buildScenario();
    repository.buscarPorId.mockResolvedValue(null);
    await expect(useCase.buscar('x')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
