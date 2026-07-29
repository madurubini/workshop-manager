import type { OrcamentoAprovado } from '../../ordem-servico/dominio/eventos';
import { Fornecedor } from './fornecedor';
import { PecaRepository } from './peca.repositorio';
import { EncomendaRepository } from './encomenda.repositorio';
import { ReservarNaAprovacao } from './reservar-na-aprovacao.policy';

describe('ReservarNaAprovacao (política do estoque)', () => {
  let pecas: jest.Mocked<PecaRepository>;
  let fornecedor: jest.Mocked<Fornecedor>;
  let encomendas: jest.Mocked<EncomendaRepository>;
  let policy: ReservarNaAprovacao;

  beforeEach(() => {
    pecas = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorCodigo: jest.fn(),
      listar: jest.fn(),
      reservarAtomico: jest.fn(),
    };
    fornecedor = { cotar: jest.fn(), encomendar: jest.fn() };
    encomendas = {
      registrar: jest.fn(),
      listarPendentesDaPeca: jest.fn(),
      marcarRecebida: jest.fn(),
      cancelarPendentesDaOrdem: jest.fn(),
    };
    policy = new ReservarNaAprovacao(pecas, fornecedor, encomendas);
  });

  it('reserva atomicamente as peças disponíveis (sem encomendar)', async () => {
    pecas.reservarAtomico.mockResolvedValue(true);

    const evento = {
      ordemId: 'os-1',
      itensPeca: [{ pecaId: 'p1', quantidade: 4, situacao: 'DISPONIVEL' }],
    } as OrcamentoAprovado;

    await policy.aoAprovarOrcamento(evento);

    expect(pecas.reservarAtomico).toHaveBeenCalledWith({
      pecaId: 'p1',
      ordemId: 'os-1',
      quantidade: 4,
    });
    expect(fornecedor.encomendar).not.toHaveBeenCalled();
    expect(encomendas.registrar).not.toHaveBeenCalled();
  });

  it('encomenda as faltantes (em cotação) e registra a pendência', async () => {
    const evento = {
      ordemId: 'os-1',
      itensPeca: [{ pecaId: 'p1', quantidade: 2, situacao: 'EM_COTACAO' }],
    } as OrcamentoAprovado;

    await policy.aoAprovarOrcamento(evento);

    expect(pecas.reservarAtomico).not.toHaveBeenCalled();
    expect(fornecedor.encomendar).toHaveBeenCalledWith({
      ordemId: 'os-1',
      pecaId: 'p1',
      quantidade: 2,
    });
    expect(encomendas.registrar).toHaveBeenCalledWith({
      ordemId: 'os-1',
      pecaId: 'p1',
      quantidade: 2,
    });
  });

  it('cai para encomenda (e registra) quando perde a corrida', async () => {
    pecas.reservarAtomico.mockResolvedValue(false); // disponível acabou

    const evento = {
      ordemId: 'os-1',
      itensPeca: [{ pecaId: 'p1', quantidade: 4, situacao: 'DISPONIVEL' }],
    } as OrcamentoAprovado;

    await policy.aoAprovarOrcamento(evento);

    expect(pecas.reservarAtomico).toHaveBeenCalled();
    expect(fornecedor.encomendar).toHaveBeenCalledWith({
      ordemId: 'os-1',
      pecaId: 'p1',
      quantidade: 4,
    });
    expect(encomendas.registrar).toHaveBeenCalledWith({
      ordemId: 'os-1',
      pecaId: 'p1',
      quantidade: 4,
    });
  });
});
