import { OrdemServicoRepository } from '../dominio/repositorios';
import { RelatorioTempoMedioExecucao } from './relatorio-tempo-medio.usecase';

function repo(): jest.Mocked<OrdemServicoRepository> {
  return {
    inserir: jest.fn(),
    atualizar: jest.fn(),
    buscarPorId: jest.fn(),
    listar: jest.fn(),
    proximoNumero: jest.fn(),
    listarTemposExecucao: jest.fn(),
  };
}

describe('RelatorioTempoMedioExecucao', () => {
  it('calcula a média em minutos e o total', async () => {
    const r = repo();
    r.listarTemposExecucao.mockResolvedValue([
      {
        iniciadoExecucaoEm: new Date('2026-06-17T10:00:00Z'),
        finalizadoEm: new Date('2026-06-17T11:00:00Z'), // 60 min
      },
      {
        iniciadoExecucaoEm: new Date('2026-06-17T10:00:00Z'),
        finalizadoEm: new Date('2026-06-17T10:30:00Z'), // 30 min
      },
    ]);

    const relatorio = await new RelatorioTempoMedioExecucao(r).executar();

    expect(relatorio.totalOrdens).toBe(2);
    expect(relatorio.tempoMedioMinutos).toBe(45);
  });

  it('retorna nulo quando não há OS concluída', async () => {
    const r = repo();
    r.listarTemposExecucao.mockResolvedValue([]);
    const relatorio = await new RelatorioTempoMedioExecucao(r).executar();
    expect(relatorio).toEqual({ totalOrdens: 0, tempoMedioMinutos: null });
  });
});
