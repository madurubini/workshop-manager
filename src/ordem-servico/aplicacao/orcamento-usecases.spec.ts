import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import { SituacaoPecaOrcada } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import { StatusOS } from '../dominio/status-os';
import { OrdemServicoRepository } from '../dominio/repositorios';
import { AprovarOrcamento } from './aprovar-orcamento.usecase';
import { RecusarOrcamento } from './recusar-orcamento.usecase';

function osComOrcamentoEnviado(): OrdemServico {
  const os = OrdemServico.abrir({
    id: 'os-1',
    numero: 'OS-000001',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'x',
  });
  os.iniciarDiagnostico();
  os.registrarDiagnostico({
    servicos: [
      {
        id: 'is1',
        servicoId: 's1',
        descricao: 'S',
        quantidade: 1,
        precoAplicado: 100,
      },
    ],
    pecas: [
      {
        id: 'ip1',
        pecaId: 'p1',
        descricao: 'Filtro',
        quantidade: 2,
        precoAplicado: 35,
        situacao: SituacaoPecaOrcada.DISPONIVEL,
      },
    ],
    orcamentoId: 'orc-1',
  });
  os.puxarEventos();
  return os;
}

describe('Casos de uso de orçamento', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;

  beforeEach(() => {
    ordens = {
      inserir: jest.fn(),
      atualizar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      proximoNumero: jest.fn(),
      listarTemposExecucao: jest.fn(),
    };
    eventos = { publicar: jest.fn() };
  });

  describe('AprovarOrcamento', () => {
    it('aprova, leva a OS para Em execução e publica OrcamentoAprovado', async () => {
      const os = osComOrcamentoEnviado();
      ordens.buscarPorId.mockResolvedValue(os);

      await new AprovarOrcamento(ordens, eventos).executar({
        ordemId: 'os-1',
        orcamentoId: 'orc-1',
      });

      expect(os.status).toBe(StatusOS.EM_EXECUCAO);
      expect(ordens.atualizar).toHaveBeenCalledWith(os);
      const publicados = eventos.publicar.mock.calls[0] as {
        nomeEvento: string;
      }[];
      expect(
        publicados.some(
          (e) => e.nomeEvento === 'ordem-servico.orcamento-aprovado',
        ),
      ).toBe(true);
    });
  });

  describe('RecusarOrcamento', () => {
    it('recusa e cancela a OS', async () => {
      const os = osComOrcamentoEnviado();
      ordens.buscarPorId.mockResolvedValue(os);

      await new RecusarOrcamento(ordens, eventos).executar({
        ordemId: 'os-1',
        orcamentoId: 'orc-1',
        justificativa: 'caro',
      });

      expect(os.status).toBe(StatusOS.CANCELADA);
      expect(ordens.atualizar).toHaveBeenCalledWith(os);
    });
  });
});
