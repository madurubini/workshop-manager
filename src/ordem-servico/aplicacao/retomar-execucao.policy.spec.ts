import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import { PecaRecebida } from '../../estoque/entities/eventos';
import { SituacaoPecaOrcada } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import { OrdemServicoRepository } from '../dominio/repositorios';
import { StatusOS } from '../dominio/status-os';
import { RetomarExecucaoAoReceberPeca } from './retomar-execucao.policy';

function osAguardandoPeca(): OrdemServico {
  const os = OrdemServico.abrir({
    id: 'os-1',
    numero: 'OS-000001',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'Falha',
  });
  os.iniciarDiagnostico();
  os.registrarDiagnostico({
    servicos: [],
    pecas: [
      {
        id: 'ip1',
        pecaId: 'p1',
        descricao: 'Bomba',
        quantidade: 1,
        precoAplicado: 100,
        situacao: SituacaoPecaOrcada.EM_COTACAO,
      },
    ],
    orcamentoId: 'orc-1',
  });
  os.aprovarOrcamento('orc-1', 'cliente');
  os.puxarEventos();
  return os;
}

describe('RetomarExecucaoAoReceberPeca (política da OS)', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let policy: RetomarExecucaoAoReceberPeca;

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
    policy = new RetomarExecucaoAoReceberPeca(ordens, eventos);
  });

  it('recebe a peça, retoma a execução, persiste e publica os eventos', async () => {
    const os = osAguardandoPeca();
    ordens.buscarPorId.mockResolvedValue(os);

    await policy.aoReceberPeca(new PecaRecebida('os-1', 'p1', 1));

    expect(os.status).toBe(StatusOS.EM_EXECUCAO);
    expect(ordens.atualizar).toHaveBeenCalledWith(os);
    const nomes = eventos.publicar.mock.calls[0].map((e) => e.nomeEvento);
    expect(nomes).toContain('ordem-servico.status-alterado');
  });

  it('OS inexistente: não quebra e não persiste', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await policy.aoReceberPeca(new PecaRecebida('os-x', 'p1', 1));
    expect(ordens.atualizar).not.toHaveBeenCalled();
  });
});
