import { Fornecedor } from '../dominio/fornecedor';
import { Peca } from '../dominio/peca';
import { CotacaoRepository, PecaRepository } from '../dominio/repositorios';
import { EstoqueApiService } from './estoque-api.service';

function peca(saldoFisico: number, reservado = 0): Peca {
  return Peca.restaurar('p1', {
    codigo: 'X',
    nome: 'Pastilha',
    precoUnitario: 180,
    saldoFisico,
    reservado,
    ativo: true,
  });
}

describe('EstoqueApiService', () => {
  let pecas: jest.Mocked<PecaRepository>;
  let cotacoes: jest.Mocked<CotacaoRepository>;
  let fornecedor: jest.Mocked<Fornecedor>;
  let api: EstoqueApiService;

  beforeEach(() => {
    pecas = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorCodigo: jest.fn(),
      listar: jest.fn(),
    };
    cotacoes = { registrar: jest.fn() };
    fornecedor = { cotar: jest.fn(), encomendar: jest.fn() };
    api = new EstoqueApiService(pecas, cotacoes, fornecedor);
  });

  describe('verificarDisponibilidade (somente leitura)', () => {
    it('informa suficiente quando há disponível e NÃO altera o estoque', async () => {
      pecas.buscarPorId.mockResolvedValue(peca(10));

      const [r] = await api.verificarDisponibilidade([
        { pecaId: 'p1', quantidade: 4 },
      ]);

      expect(r).toMatchObject({
        encontrada: true,
        disponivel: 10,
        suficiente: true,
        precoUnitario: 180,
      });
      // leitura pura: nada de reservar/registrar
      expect(cotacoes.registrar).not.toHaveBeenCalled();
      expect(fornecedor.cotar).not.toHaveBeenCalled();
    });

    it('marca não encontrada quando a peça não existe', async () => {
      pecas.buscarPorId.mockResolvedValue(null);
      const [r] = await api.verificarDisponibilidade([
        { pecaId: 'x', quantidade: 1 },
      ]);
      expect(r.encontrada).toBe(false);
      expect(r.suficiente).toBe(false);
    });

    it('insuficiente quando o disponível é menor que o pedido', async () => {
      pecas.buscarPorId.mockResolvedValue(peca(2, 2)); // disponível 0
      const [r] = await api.verificarDisponibilidade([
        { pecaId: 'p1', quantidade: 1 },
      ]);
      expect(r.suficiente).toBe(false);
    });
  });

  describe('solicitarCotacao', () => {
    it('pede ao fornecedor e registra a cotação', async () => {
      pecas.buscarPorId.mockResolvedValue(peca(0));
      fornecedor.cotar.mockResolvedValue({
        preco: 198,
        prazoDias: 7,
        fornecedor: 'F',
      });

      const r = await api.solicitarCotacao('os-1', 'p1', 2);

      expect(fornecedor.cotar).toHaveBeenCalledWith({
        pecaId: 'p1',
        quantidade: 2,
        precoReferencia: 180,
      });
      expect(cotacoes.registrar).toHaveBeenCalledWith({
        ordemId: 'os-1',
        pecaId: 'p1',
        preco: 198,
        prazoDias: 7,
        fornecedor: 'F',
      });
      expect(r.preco).toBe(198);
    });

    it('rejeita quando a peça não existe', async () => {
      pecas.buscarPorId.mockResolvedValue(null);
      await expect(api.solicitarCotacao('os-1', 'x', 1)).rejects.toThrow();
    });
  });
});
