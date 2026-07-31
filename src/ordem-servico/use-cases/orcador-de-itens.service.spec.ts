import { CatalogoServicosApi } from '../../catalogo-servicos/use-cases/catalogo-servicos.api';
import { EstoqueApi } from '../../estoque/use-cases/estoque.api';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { SituacaoPecaOrcada } from '../entities/itens';
import { GeradorDeId } from '../../compartilhado/dominio/gerador-de-id';
import { OrcadorDeItens } from './orcador-de-itens.service';

describe('OrcadorDeItens', () => {
  let catalogo: jest.Mocked<CatalogoServicosApi>;
  let estoque: jest.Mocked<EstoqueApi>;
  let orcador: OrcadorDeItens;

  beforeEach(() => {
    catalogo = { buscarServico: jest.fn() };
    estoque = {
      verificarDisponibilidade: jest.fn(),
      solicitarCotacao: jest.fn(),
    };
    const idGenerator: jest.Mocked<GeradorDeId> = {
      novo: jest.fn().mockReturnValue('id-fixo'),
    };
    orcador = new OrcadorDeItens(catalogo, estoque, idGenerator);
  });

  describe('orcarServicos', () => {
    it('congela o preço base do catálogo', async () => {
      catalogo.buscarServico.mockResolvedValue({
        id: 's1',
        nome: 'Troca de óleo',
        precoBase: 120,
      });
      const [servicoOrcado] = await orcador.orcarServicos([
        { servicoId: 's1', quantidade: 2 },
      ]);
      expect(servicoOrcado.descricao).toBe('Troca de óleo');
      expect(servicoOrcado.precoAplicado).toBe(120);
    });

    it('rejeita serviço inexistente', async () => {
      catalogo.buscarServico.mockResolvedValue(null);
      await expect(
        orcador.orcarServicos([{ servicoId: 'x', quantidade: 1 }]),
      ).rejects.toBeInstanceOf(ErroValidacao);
    });
  });

  describe('orcarPecas', () => {
    it('peça disponível: congela preço do estoque e marca DISPONIVEL (sem cotar)', async () => {
      estoque.verificarDisponibilidade.mockResolvedValue([
        {
          pecaId: 'p1',
          encontrada: true,
          nome: 'Filtro',
          precoUnitario: 35,
          disponivel: 10,
          suficiente: true,
        },
      ]);
      const [pecaOrcada] = await orcador.orcarPecas('os-1', [
        { pecaId: 'p1', quantidade: 4 },
      ]);
      expect(pecaOrcada.situacao).toBe(SituacaoPecaOrcada.DISPONIVEL);
      expect(pecaOrcada.precoAplicado).toBe(35);
      expect(estoque.solicitarCotacao).not.toHaveBeenCalled();
    });

    it('peça em falta: cota e congela o preço cotado (EM_COTACAO)', async () => {
      estoque.verificarDisponibilidade.mockResolvedValue([
        {
          pecaId: 'p2',
          encontrada: true,
          nome: 'Pastilha',
          precoUnitario: 180,
          disponivel: 0,
          suficiente: false,
        },
      ]);
      estoque.solicitarCotacao.mockResolvedValue({
        preco: 198,
        prazoDias: 7,
        fornecedor: 'F',
      });
      const [pecaOrcada] = await orcador.orcarPecas('os-1', [
        { pecaId: 'p2', quantidade: 1 },
      ]);
      expect(pecaOrcada.situacao).toBe(SituacaoPecaOrcada.EM_COTACAO);
      expect(pecaOrcada.precoAplicado).toBe(198);
      expect(estoque.solicitarCotacao).toHaveBeenCalledWith('os-1', 'p2', 1);
    });

    it('rejeita peça inexistente', async () => {
      estoque.verificarDisponibilidade.mockResolvedValue([
        {
          pecaId: 'x',
          encontrada: false,
          nome: '',
          precoUnitario: 0,
          disponivel: 0,
          suficiente: false,
        },
      ]);
      await expect(
        orcador.orcarPecas('os-1', [{ pecaId: 'x', quantidade: 1 }]),
      ).rejects.toBeInstanceOf(ErroValidacao);
    });

    it('lista vazia não chama o estoque', async () => {
      const pecasOrcadas = await orcador.orcarPecas('os-1', []);
      expect(pecasOrcadas).toEqual([]);
      expect(estoque.verificarDisponibilidade).not.toHaveBeenCalled();
    });
  });
});
