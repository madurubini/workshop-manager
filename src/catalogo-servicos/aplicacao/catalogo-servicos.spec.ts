import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { Servico } from '../dominio/servico';
import { ServicoRepository } from '../dominio/repositorio';
import { CatalogoServicosApiService } from './catalogo-servicos-api.service';

describe('Servico (domínio)', () => {
  it('cria serviço válido', () => {
    const s = Servico.criar({ id: 's1', nome: ' Troca ', precoBase: 120 });
    expect(s.nome).toBe('Troca');
    expect(s.precoBase).toBe(120);
    expect(s.ativo).toBe(true);
    expect(s.descricao).toBeNull();
  });

  it('valida nome e preço', () => {
    expect(() => Servico.criar({ id: 's', nome: ' ', precoBase: 1 })).toThrow(
      ErroValidacao,
    );
    expect(() => Servico.criar({ id: 's', nome: 'X', precoBase: -1 })).toThrow(
      ErroValidacao,
    );
  });

  it('inativa (soft delete)', () => {
    const s = Servico.criar({ id: 's1', nome: 'X', precoBase: 1 });
    s.inativar();
    expect(s.ativo).toBe(false);
  });

  it('atualiza dados', () => {
    const s = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    s.atualizarDados({ nome: 'Y', precoBase: 20, descricao: 'desc' });
    expect(s.nome).toBe('Y');
    expect(s.precoBase).toBe(20);
    expect(s.descricao).toBe('desc');
  });

  it('rejeita preço negativo na atualização', () => {
    const s = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    expect(() => s.atualizarDados({ precoBase: -1 })).toThrow(ErroValidacao);
  });
});

describe('CatalogoServicosApiService (porta pública)', () => {
  let servicos: jest.Mocked<ServicoRepository>;
  let api: CatalogoServicosApiService;

  beforeEach(() => {
    servicos = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
    };
    api = new CatalogoServicosApiService(servicos);
  });

  it('devolve dados do serviço ativo (para congelar preço)', async () => {
    servicos.buscarPorId.mockResolvedValue(
      Servico.criar({ id: 's1', nome: 'Troca', precoBase: 120 }),
    );
    expect(await api.buscarServico('s1')).toEqual({
      id: 's1',
      nome: 'Troca',
      precoBase: 120,
    });
  });

  it('devolve null quando não existe', async () => {
    servicos.buscarPorId.mockResolvedValue(null);
    expect(await api.buscarServico('x')).toBeNull();
  });

  it('devolve null quando inativo', async () => {
    const s = Servico.criar({ id: 's1', nome: 'Troca', precoBase: 120 });
    s.inativar();
    servicos.buscarPorId.mockResolvedValue(s);
    expect(await api.buscarServico('s1')).toBeNull();
  });
});
