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
  it('calcula a média geral em minutos e o total', async () => {
    const r = repo();
    r.listarTemposExecucao.mockResolvedValue([
      {
        iniciadoExecucaoEm: new Date('2026-06-17T10:00:00Z'),
        finalizadoEm: new Date('2026-06-17T11:00:00Z'), // 60 min
        servicos: [],
      },
      {
        iniciadoExecucaoEm: new Date('2026-06-17T10:00:00Z'),
        finalizadoEm: new Date('2026-06-17T10:30:00Z'), // 30 min
        servicos: [],
      },
    ]);

    const relatorio = await new RelatorioTempoMedioExecucao(r).executar();

    expect(relatorio.totalOrdens).toBe(2);
    expect(relatorio.tempoMedioMinutos).toBe(45);
  });

  it('quebra o tempo médio por tipo de serviço (abordagem por OS)', async () => {
    const r = repo();
    r.listarTemposExecucao.mockResolvedValue([
      {
        iniciadoExecucaoEm: new Date('2026-06-17T10:00:00Z'),
        finalizadoEm: new Date('2026-06-17T11:00:00Z'), // 60 min
        servicos: [
          { id: 'oleo', nome: 'Troca de óleo' },
          { id: 'alinha', nome: 'Alinhamento' },
        ],
      },
      {
        iniciadoExecucaoEm: new Date('2026-06-17T10:00:00Z'),
        finalizadoEm: new Date('2026-06-17T10:20:00Z'), // 20 min
        servicos: [{ id: 'oleo', nome: 'Troca de óleo' }],
      },
    ]);

    const { porServico } = await new RelatorioTempoMedioExecucao(r).executar();

    // Ordenado por nome: Alinhamento, depois Troca de óleo.
    expect(porServico).toEqual([
      {
        servicoId: 'alinha',
        servicoNome: 'Alinhamento',
        totalOrdens: 1,
        tempoMedioMinutos: 60,
      },
      {
        servicoId: 'oleo',
        servicoNome: 'Troca de óleo',
        totalOrdens: 2,
        tempoMedioMinutos: 40, // (60 + 20) / 2
      },
    ]);
  });

  it('retorna vazio quando não há OS concluída', async () => {
    const r = repo();
    r.listarTemposExecucao.mockResolvedValue([]);
    const relatorio = await new RelatorioTempoMedioExecucao(r).executar();
    expect(relatorio).toEqual({
      totalOrdens: 0,
      tempoMedioMinutos: null,
      porServico: [],
    });
  });
});
