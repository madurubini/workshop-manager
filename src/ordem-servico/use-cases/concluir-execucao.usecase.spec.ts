import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { SituacaoPecaOrcada } from '../entities/itens';
import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';
import { OrdemServicoRepository } from './ordem-servico.repositorio';
import { ConcluirExecucao } from './concluir-execucao.usecase';

function osEmExecucao(): OrdemServico {
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
        quantidade: 1,
        precoAplicado: 35,
        situacao: SituacaoPecaOrcada.DISPONIVEL,
      },
    ],
    orcamentoId: 'orc-1',
  });
  os.aprovarOrcamento('orc-1', 'cliente'); // tudo disponível → Em execução
  os.puxarEventos();
  return os;
}

describe('ConcluirExecucao', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let usecase: ConcluirExecucao;

  beforeEach(() => {
    ordens = {
      inserir: jest.fn(),
      atualizar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      proximoNumero: jest.fn(),
      listarTemposExecucao: jest.fn(),
      listarFila: jest.fn(),
    };
    eventos = { publicar: jest.fn() };
    usecase = new ConcluirExecucao(ordens, eventos);
  });

  it('conclui a execução, salva e publica execucao-concluida', async () => {
    const os = osEmExecucao();
    ordens.buscarPorId.mockResolvedValue(os);

    const ordem = await usecase.executar({ ordemId: 'os-1', por: 'mecanico' });

    expect(ordem.status).toBe(StatusOS.FINALIZADA);
    expect(ordens.atualizar).toHaveBeenCalledWith(os);
    const publicados = eventos.publicar.mock.calls[0] as {
      nomeEvento: string;
    }[];
    expect(
      publicados.some(
        (e) => e.nomeEvento === 'ordem-servico.execucao-concluida',
      ),
    ).toBe(true);
  });

  it('rejeita quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await expect(usecase.executar({ ordemId: 'x' })).rejects.toBeInstanceOf(
      ErroNaoEncontrado,
    );
  });

  it('propaga a regra de domínio (orçamento pendente impede concluir)', async () => {
    const os = OrdemServico.abrir({
      id: 'os-2',
      numero: 'OS-000002',
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
      pecas: [],
      orcamentoId: 'orc-1',
    }); // fica em Aguardando aprovação, orçamento ENVIADO (pendente)
    ordens.buscarPorId.mockResolvedValue(os);

    await expect(usecase.executar({ ordemId: 'os-2' })).rejects.toBeInstanceOf(
      ErroValidacao,
    );
  });
});
