import {
  ErroConflito,
  ErroNaoEncontrado,
} from '../../compartilhado/erros/erros-dominio';
import { Peca } from '../dominio/peca';
import { PecaRepository } from '../dominio/repositorios';
import {
  AjustarEstoque,
  AtualizarPeca,
  CadastrarPeca,
  RemoverPeca,
} from './peca-crud.usecases';

function repo(): jest.Mocked<PecaRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorCodigo: jest.fn(),
    reservarAtomico: jest.fn(),
    listar: jest.fn(),
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

describe('CRUD de peça', () => {
  it('cadastra quando o código é único', async () => {
    const r = repo();
    r.buscarPorCodigo.mockResolvedValue(null);
    const p = await new CadastrarPeca(r).executar({
      codigo: 'FILTRO',
      nome: 'Filtro',
      precoUnitario: 35,
      saldoFisico: 5,
    });
    expect(p.codigo).toBe('FILTRO');
    expect(r.inserir).toHaveBeenCalledWith(p);
  });

  it('rejeita código duplicado', async () => {
    const r = repo();
    r.buscarPorCodigo.mockResolvedValue(umaPeca());
    await expect(
      new CadastrarPeca(r).executar({
        codigo: 'FILTRO',
        nome: 'Filtro',
        precoUnitario: 35,
      }),
    ).rejects.toBeInstanceOf(ErroConflito);
    expect(r.inserir).not.toHaveBeenCalled();
  });

  it('atualiza nome/preço', async () => {
    const r = repo();
    r.buscarPorId.mockResolvedValue(umaPeca());
    const p = await new AtualizarPeca(r).executar({
      id: 'p1',
      precoUnitario: 40,
    });
    expect(p.precoUnitario).toBe(40);
  });

  it('remove (soft delete)', async () => {
    const r = repo();
    const p = umaPeca();
    r.buscarPorId.mockResolvedValue(p);
    await new RemoverPeca(r).executar({ id: 'p1' });
    expect(p.ativo).toBe(false);
  });

  it('ajusta estoque (entrada)', async () => {
    const r = repo();
    r.buscarPorId.mockResolvedValue(umaPeca(10));
    const p = await new AjustarEstoque(r).executar({
      id: 'p1',
      tipo: 'ENTRADA',
      quantidade: 5,
    });
    expect(p.saldoFisico).toBe(15);
  });

  it('ajuste falha quando não encontra a peça', async () => {
    const r = repo();
    r.buscarPorId.mockResolvedValue(null);
    await expect(
      new AjustarEstoque(r).executar({ id: 'x', tipo: 'SAIDA', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
