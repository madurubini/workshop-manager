import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';
import { ConsultarOrdemServico } from './consultar-ordem-servico.usecase';
import { OrdemServicoRepository } from './ordem-servico.repositorio';

function os(id: string, status: StatusOS, criadoEm: Date): OrdemServico {
  return OrdemServico.restaurar(id, {
    numero: id,
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'x',
    status,
    versao: 1,
    pago: false,
    pagoEm: null,
    criadoEm,
    iniciadoExecucaoEm: null,
    finalizadoEm: null,
    historico: [],
    orcamentos: [],
  });
}

describe('ConsultarOrdemServico', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let usecase: ConsultarOrdemServico;

  beforeEach(() => {
    ordens = {
      inserir: jest.fn(),
      atualizar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      listarFila: jest.fn(),
      proximoNumero: jest.fn(),
      listarTemposExecucao: jest.fn(),
    };
    usecase = new ConsultarOrdemServico(ordens);
  });

  describe('buscar', () => {
    it('devolve a OS quando existe', async () => {
      const ordem = os('os-1', StatusOS.RECEBIDA, new Date());
      ordens.buscarPorId.mockResolvedValue(ordem);
      await expect(usecase.buscar('os-1')).resolves.toBe(ordem);
    });

    it('lança ErroNaoEncontrado quando não existe', async () => {
      ordens.buscarPorId.mockResolvedValue(null);
      await expect(usecase.buscar('x')).rejects.toBeInstanceOf(
        ErroNaoEncontrado,
      );
    });
  });

  describe('listar', () => {
    it('repassa o filtro ao repositório', async () => {
      ordens.listar.mockResolvedValue([]);
      await usecase.listar({ status: StatusOS.RECEBIDA });
      expect(ordens.listar).toHaveBeenCalledWith({
        status: StatusOS.RECEBIDA,
      });
    });
  });

  describe('listarFila', () => {
    it('ordena por prioridade de status (Em execução > Aguardando aprovação > Em diagnóstico > Recebida > Aguardando peça)', async () => {
      const agora = new Date();
      // Devolve fora de ordem de propósito para provar a ordenação.
      ordens.listarFila.mockResolvedValue([
        os('recebida', StatusOS.RECEBIDA, agora),
        os('execucao', StatusOS.EM_EXECUCAO, agora),
        os('aguardando-peca', StatusOS.AGUARDANDO_PECA, agora),
        os('aprovacao', StatusOS.AGUARDANDO_APROVACAO, agora),
        os('diagnostico', StatusOS.EM_DIAGNOSTICO, agora),
      ]);

      const fila = await usecase.listarFila();

      expect(fila.map((ordem) => ordem.id)).toEqual([
        'execucao',
        'aprovacao',
        'diagnostico',
        'recebida',
        'aguardando-peca',
      ]);
    });

    it('mantém as mais antigas primeiro dentro do mesmo status (sort estável)', async () => {
      const antiga = new Date('2026-01-01T09:00:00Z');
      const nova = new Date('2026-01-01T10:00:00Z');
      // Já chegam ordenadas por data (asc) do repositório.
      ordens.listarFila.mockResolvedValue([
        os('recebida-antiga', StatusOS.RECEBIDA, antiga),
        os('recebida-nova', StatusOS.RECEBIDA, nova),
        os('execucao', StatusOS.EM_EXECUCAO, nova),
      ]);

      const fila = await usecase.listarFila();

      expect(fila.map((ordem) => ordem.id)).toEqual([
        'execucao',
        'recebida-antiga',
        'recebida-nova',
      ]);
    });
  });
});
