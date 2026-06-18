import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { Servico } from '../dominio/servico';
import { ServicoRepository } from '../dominio/repositorio';
import {
  AtualizarServico,
  CadastrarServico,
  RemoverServico,
} from './servico-crud.usecases';

function repo(): jest.Mocked<ServicoRepository> {
  return {
    inserir: jest.fn(),
    salvar: jest.fn(),
    buscarPorId: jest.fn(),
    listar: jest.fn(),
  };
}

describe('CRUD de serviço', () => {
  it('cadastra', async () => {
    const r = repo();
    const s = await new CadastrarServico(r).executar({
      nome: 'Troca de óleo',
      precoBase: 120,
    });
    expect(s.nome).toBe('Troca de óleo');
    expect(r.inserir).toHaveBeenCalledWith(s);
  });

  it('atualiza', async () => {
    const r = repo();
    r.buscarPorId.mockResolvedValue(
      Servico.criar({ id: 's1', nome: 'X', precoBase: 10 }),
    );
    const s = await new AtualizarServico(r).executar({
      id: 's1',
      precoBase: 150,
    });
    expect(s.precoBase).toBe(150);
    expect(r.salvar).toHaveBeenCalled();
  });

  it('remove (soft delete)', async () => {
    const r = repo();
    const s = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    r.buscarPorId.mockResolvedValue(s);
    await new RemoverServico(r).executar({ id: 's1' });
    expect(s.ativo).toBe(false);
  });

  it('atualizar falha quando não encontra', async () => {
    const r = repo();
    r.buscarPorId.mockResolvedValue(null);
    await expect(
      new AtualizarServico(r).executar({ id: 'x', nome: 'Y' }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
