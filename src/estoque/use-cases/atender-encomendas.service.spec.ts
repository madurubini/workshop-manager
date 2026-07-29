import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import { PecaRecebida } from '../entities/eventos';
import { PecaRepository } from './peca.repositorio';
import { DadosEncomenda, EncomendaRepository } from './encomenda.repositorio';
import { AtenderEncomendasDaPeca } from './atender-encomendas.service';

function pendente(over: Partial<DadosEncomenda> = {}): DadosEncomenda {
  return {
    id: 'e1',
    pecaId: 'p1',
    ordemId: 'os-1',
    quantidade: 1,
    status: 'PENDENTE',
    ...over,
  };
}

describe('AtenderEncomendasDaPeca', () => {
  let pecas: jest.Mocked<PecaRepository>;
  let encomendas: jest.Mocked<EncomendaRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let service: AtenderEncomendasDaPeca;

  beforeEach(() => {
    pecas = {
      inserir: jest.fn(),
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorCodigo: jest.fn(),
      listar: jest.fn(),
      reservarAtomico: jest.fn(),
    };
    encomendas = {
      registrar: jest.fn(),
      listarPendentesDaPeca: jest.fn(),
      marcarRecebida: jest.fn(),
      cancelarPendentesDaOrdem: jest.fn(),
    };
    eventos = { publicar: jest.fn() };
    service = new AtenderEncomendasDaPeca(pecas, encomendas, eventos);
  });

  it('atende as pendentes na ordem (FIFO), reserva, marca recebida e publica', async () => {
    encomendas.listarPendentesDaPeca.mockResolvedValue([
      pendente({ id: 'e1', ordemId: 'os-1', quantidade: 2 }),
      pendente({ id: 'e2', ordemId: 'os-2', quantidade: 1 }),
    ]);
    pecas.reservarAtomico.mockResolvedValue(true);

    await service.executar('p1');

    expect(pecas.reservarAtomico).toHaveBeenCalledTimes(2);
    expect(encomendas.marcarRecebida).toHaveBeenCalledWith('e1');
    expect(encomendas.marcarRecebida).toHaveBeenCalledWith('e2');
    expect(eventos.publicar).toHaveBeenCalledTimes(2);
    const primeiro = eventos.publicar.mock.calls[0][0] as PecaRecebida;
    expect(primeiro).toBeInstanceOf(PecaRecebida);
    expect(primeiro.ordemId).toBe('os-1');
    expect(primeiro.pecaId).toBe('p1');
    expect(primeiro.quantidade).toBe(2);
  });

  it('para no FIFO quando o saldo não cobre a próxima encomenda', async () => {
    encomendas.listarPendentesDaPeca.mockResolvedValue([
      pendente({ id: 'e1', ordemId: 'os-1', quantidade: 5 }),
      pendente({ id: 'e2', ordemId: 'os-2', quantidade: 1 }),
    ]);
    pecas.reservarAtomico.mockResolvedValueOnce(false);

    await service.executar('p1');

    expect(pecas.reservarAtomico).toHaveBeenCalledTimes(1);
    expect(encomendas.marcarRecebida).not.toHaveBeenCalled();
    expect(eventos.publicar).not.toHaveBeenCalled();
  });

  it('sem pendentes: não faz nada', async () => {
    encomendas.listarPendentesDaPeca.mockResolvedValue([]);
    await service.executar('p1');
    expect(pecas.reservarAtomico).not.toHaveBeenCalled();
    expect(eventos.publicar).not.toHaveBeenCalled();
  });
});
