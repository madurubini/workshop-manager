import { SituacaoPecaOrcada } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import { StatusOS } from '../dominio/status-os';
import { OrdemServicoRepository } from '../dominio/repositorios';
import { OrdemServicoConsultaService } from './ordem-servico-consulta.service';

function servico() {
  return {
    id: 'is1',
    servicoId: 's1',
    descricao: 'S',
    quantidade: 1,
    precoAplicado: 100,
  };
}

function osAguardandoAprovacao(): OrdemServico {
  const os = OrdemServico.abrir({
    id: 'os-ag',
    numero: 'OS-000001',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'x',
  });
  os.iniciarDiagnostico();
  os.registrarDiagnostico({
    servicos: [servico()],
    pecas: [],
    orcamentoId: 'orc-1',
  });
  return os; // status AGUARDANDO_APROVACAO
}

function osEmExecucaoComAdicional(): OrdemServico {
  const os = OrdemServico.abrir({
    id: 'os-ex',
    numero: 'OS-000002',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'x',
  });
  os.iniciarDiagnostico();
  os.registrarDiagnostico({
    servicos: [servico()],
    pecas: [
      {
        id: 'ip1',
        pecaId: 'p1',
        descricao: 'Filtro',
        quantidade: 1,
        precoAplicado: 35,
        situacao: SituacaoPecaOrcada.DISPONIVEL,
      },
    ],
    orcamentoId: 'orc-1',
  });
  os.aprovarOrcamento('orc-1', 'cliente'); // → Em execução
  os.adicionarOrcamentoAdicional({
    id: 'orc-2',
    descricao: 'Correia',
    servicos: [{ ...servico(), id: 'is2', servicoId: 's2', precoAplicado: 80 }],
    pecas: [],
  }); // ADICIONAL nasce ENVIADO
  return os;
}

describe('OrdemServicoConsultaService', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let service: OrdemServicoConsultaService;

  beforeEach(() => {
    ordens = {
      inserir: jest.fn(),
      atualizar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      proximoNumero: jest.fn(),
      listarTemposExecucao: jest.fn(),
    };
    ordens.listar.mockImplementation(async (filtro) => {
      if (filtro?.status === StatusOS.AGUARDANDO_APROVACAO) {
        return [osAguardandoAprovacao()];
      }
      if (filtro?.status === StatusOS.EM_EXECUCAO) {
        return [osEmExecucaoComAdicional()];
      }
      return [];
    });
    service = new OrdemServicoConsultaService(ordens);
  });

  it('lista as OS aguardando resposta do cliente', async () => {
    const r = await service.listarAguardandoResposta();
    expect(r).toEqual([{ ordemId: 'os-ag', numero: 'OS-000001' }]);
    expect(ordens.listar).toHaveBeenCalledWith({
      status: StatusOS.AGUARDANDO_APROVACAO,
    });
  });

  it('lista os orçamentos adicionais aguardando autorização', async () => {
    const r = await service.listarOrcamentosAdicionaisAguardando();
    expect(r).toEqual([
      { ordemId: 'os-ex', numero: 'OS-000002', orcamentoId: 'orc-2' },
    ]);
  });
});
