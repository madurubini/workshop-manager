import type { OSCancelada } from '../../ordem-servico/entities/eventos';
import { EncomendaRepository } from './encomenda.repositorio';
import { CancelarEncomendasNoCancelamento } from './cancelar-encomendas.policy';

describe('CancelarEncomendasNoCancelamento (política do estoque)', () => {
  let encomendas: jest.Mocked<EncomendaRepository>;
  let policy: CancelarEncomendasNoCancelamento;

  beforeEach(() => {
    encomendas = {
      registrar: jest.fn(),
      listarPendentesDaPeca: jest.fn(),
      marcarRecebida: jest.fn(),
      cancelarPendentesDaOrdem: jest.fn(),
    };
    policy = new CancelarEncomendasNoCancelamento(encomendas);
  });

  it('cancela as encomendas pendentes da OS cancelada', async () => {
    await policy.tratar({ ordemId: 'os-1' } as OSCancelada);
    expect(encomendas.cancelarPendentesDaOrdem).toHaveBeenCalledWith('os-1');
  });
});
