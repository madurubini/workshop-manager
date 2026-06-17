import type { OrcamentoAprovado } from '../../ordem-servico/dominio/eventos';
import { Fornecedor } from '../dominio/fornecedor';
import { Peca } from '../dominio/peca';
import { PecaRepository, ReservaRepository } from '../dominio/repositorios';
import { ReservarNaAprovacao } from './reservar-na-aprovacao.policy';

function peca(saldo: number, reservado = 0): Peca {
  return Peca.restaurar('p1', {
    codigo: 'X',
    nome: 'Peça',
    precoUnitario: 35,
    saldoFisico: saldo,
    reservado,
    ativo: true,
  });
}

describe('ReservarNaAprovacao (política do estoque)', () => {
  let pecas: jest.Mocked<PecaRepository>;
  let reservas: jest.Mocked<ReservaRepository>;
  let fornecedor: jest.Mocked<Fornecedor>;
  let policy: ReservarNaAprovacao;

  beforeEach(() => {
    pecas = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorCodigo: jest.fn(),
      listar: jest.fn(),
    };
    reservas = { registrar: jest.fn(), listarReservadasDaOrdem: jest.fn() };
    fornecedor = { cotar: jest.fn(), encomendar: jest.fn() };
    policy = new ReservarNaAprovacao(pecas, reservas, fornecedor);
  });

  it('reserva as peças disponíveis (sobe reservado, registra reserva)', async () => {
    const p = peca(10);
    pecas.buscarPorId.mockResolvedValue(p);

    const evento = {
      ordemId: 'os-1',
      itensPeca: [{ pecaId: 'p1', quantidade: 4, situacao: 'DISPONIVEL' }],
    } as OrcamentoAprovado;

    await policy.tratar(evento);

    expect(p.reservado).toBe(4);
    expect(pecas.salvar).toHaveBeenCalledWith(p);
    expect(reservas.registrar).toHaveBeenCalledWith({
      pecaId: 'p1',
      ordemId: 'os-1',
      quantidade: 4,
      status: 'RESERVADA',
    });
    expect(fornecedor.encomendar).not.toHaveBeenCalled();
  });

  it('encomenda as faltantes (em cotação)', async () => {
    pecas.buscarPorId.mockResolvedValue(peca(0));

    const evento = {
      ordemId: 'os-1',
      itensPeca: [{ pecaId: 'p1', quantidade: 2, situacao: 'EM_COTACAO' }],
    } as OrcamentoAprovado;

    await policy.tratar(evento);

    expect(fornecedor.encomendar).toHaveBeenCalledWith({
      ordemId: 'os-1',
      pecaId: 'p1',
      quantidade: 2,
    });
    expect(reservas.registrar).not.toHaveBeenCalled();
  });

  it('encomenda quando marcada disponível mas o estoque já não basta', async () => {
    pecas.buscarPorId.mockResolvedValue(peca(1)); // disponível 1 < 4

    const evento = {
      ordemId: 'os-1',
      itensPeca: [{ pecaId: 'p1', quantidade: 4, situacao: 'DISPONIVEL' }],
    } as OrcamentoAprovado;

    await policy.tratar(evento);

    expect(reservas.registrar).not.toHaveBeenCalled();
    expect(fornecedor.encomendar).toHaveBeenCalled();
  });
});
