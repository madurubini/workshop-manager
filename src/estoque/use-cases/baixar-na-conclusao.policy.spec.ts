import type { ExecucaoConcluida } from '../../ordem-servico/entities/eventos';
import { Peca } from '../entities/peca';
import { PecaRepository } from './peca.repositorio';
import { ReservaRepository } from './reserva.repositorio';
import { BaixarNaConclusao } from './baixar-na-conclusao.policy';

describe('BaixarNaConclusao (política do estoque)', () => {
  let pecas: jest.Mocked<PecaRepository>;
  let reservas: jest.Mocked<ReservaRepository>;
  let policy: BaixarNaConclusao;

  beforeEach(() => {
    pecas = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorCodigo: jest.fn(),
      reservarAtomico: jest.fn(),
      listar: jest.fn(),
    };
    reservas = {
      registrar: jest.fn(),
      listarReservadasDaOrdem: jest.fn(),
      marcarBaixadasDaOrdem: jest.fn(),
    };
    policy = new BaixarNaConclusao(pecas, reservas);
  });

  it('baixa cada peça reservada e marca as reservas como baixadas', async () => {
    const peca = Peca.restaurar('p1', {
      codigo: 'X',
      nome: 'Filtro',
      precoUnitario: 35,
      saldoFisico: 10,
      reservado: 4,
      ativo: true,
    });
    reservas.listarReservadasDaOrdem.mockResolvedValue([
      { pecaId: 'p1', ordemId: 'os-1', quantidade: 4, status: 'RESERVADA' },
    ]);
    pecas.buscarPorId.mockResolvedValue(peca);

    await policy.tratar({ ordemId: 'os-1' } as ExecucaoConcluida);

    expect(peca.saldoFisico).toBe(6);
    expect(peca.reservado).toBe(0);
    expect(pecas.salvar).toHaveBeenCalledWith(peca);
    expect(reservas.marcarBaixadasDaOrdem).toHaveBeenCalledWith('os-1');
  });

  it('sem reservas, apenas marca baixadas (no-op de baixa)', async () => {
    reservas.listarReservadasDaOrdem.mockResolvedValue([]);
    await policy.tratar({ ordemId: 'os-1' } as ExecucaoConcluida);
    expect(pecas.salvar).not.toHaveBeenCalled();
    expect(reservas.marcarBaixadasDaOrdem).toHaveBeenCalledWith('os-1');
  });
});
