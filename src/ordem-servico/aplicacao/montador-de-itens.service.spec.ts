import { CatalogoServicosApi } from '../../catalogo-servicos/aplicacao/catalogo-servicos.api';
import { EstoqueApi } from '../../estoque/aplicacao/estoque.api';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { SituacaoPecaOrcada } from '../dominio/itens';
import { MontadorDeItens } from './montador-de-itens.service';

describe('MontadorDeItens', () => {
  let catalogo: jest.Mocked<CatalogoServicosApi>;
  let estoque: jest.Mocked<EstoqueApi>;
  let montador: MontadorDeItens;

  beforeEach(() => {
    catalogo = { buscarServico: jest.fn() };
    estoque = {
      verificarDisponibilidade: jest.fn(),
      solicitarCotacao: jest.fn(),
    };
    montador = new MontadorDeItens(catalogo, estoque);
  });

  describe('montarServicos', () => {
    it('congela o preço base do catálogo', async () => {
      catalogo.buscarServico.mockResolvedValue({
        id: 's1',
        nome: 'Troca de óleo',
        precoBase: 120,
      });
      const [item] = await montador.montarServicos([
        { servicoId: 's1', quantidade: 2 },
      ]);
      expect(item.descricao).toBe('Troca de óleo');
      expect(item.precoAplicado).toBe(120);
    });

    it('rejeita serviço inexistente', async () => {
      catalogo.buscarServico.mockResolvedValue(null);
      await expect(
        montador.montarServicos([{ servicoId: 'x', quantidade: 1 }]),
      ).rejects.toBeInstanceOf(ErroValidacao);
    });
  });

  describe('montarPecas', () => {
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
      const [item] = await montador.montarPecas('os-1', [
        { pecaId: 'p1', quantidade: 4 },
      ]);
      expect(item.situacao).toBe(SituacaoPecaOrcada.DISPONIVEL);
      expect(item.precoAplicado).toBe(35);
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
      const [item] = await montador.montarPecas('os-1', [
        { pecaId: 'p2', quantidade: 1 },
      ]);
      expect(item.situacao).toBe(SituacaoPecaOrcada.EM_COTACAO);
      expect(item.precoAplicado).toBe(198);
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
        montador.montarPecas('os-1', [{ pecaId: 'x', quantidade: 1 }]),
      ).rejects.toBeInstanceOf(ErroValidacao);
    });

    it('lista vazia não chama o estoque', async () => {
      const itens = await montador.montarPecas('os-1', []);
      expect(itens).toEqual([]);
      expect(estoque.verificarDisponibilidade).not.toHaveBeenCalled();
    });
  });
});
