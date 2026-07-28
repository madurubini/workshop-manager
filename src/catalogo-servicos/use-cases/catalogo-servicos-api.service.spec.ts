import { Servico } from '../entities/servico';
import { ServicoRepository } from './servico.repositorio';
import { CatalogoServicosApiService } from './catalogo-servicos-api.service';

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
