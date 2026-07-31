import { GeradorDeId } from '../../compartilhado/dominio/gerador-de-id';
import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { SituacaoPecaOrcada, TipoOrcamento } from '../entities/itens';
import { OrdemServicoRepository } from './ordem-servico.repositorio';
import { LancarOrcamentoAdicional } from './lancar-orcamento-adicional.usecase';
import { OrcadorDeItens } from './orcador-de-itens.service';

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
    pecas: [],
    orcamentoId: 'orc-1',
  });
  os.aprovarOrcamento('orc-1', 'cliente');
  os.puxarEventos();
  return os;
}

describe('LancarOrcamentoAdicional', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let orcador: jest.Mocked<
    Pick<OrcadorDeItens, 'orcarServicos' | 'orcarPecas'>
  >;
  let idGenerator: jest.Mocked<GeradorDeId>;
  let usecase: LancarOrcamentoAdicional;

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
    orcador = {
      orcarServicos: jest.fn().mockResolvedValue([
        {
          id: 'is2',
          servicoId: 's2',
          descricao: 'Correia',
          quantidade: 1,
          precoAplicado: 80,
        },
      ]),
      orcarPecas: jest.fn().mockResolvedValue([]),
    };
    idGenerator = { novo: jest.fn().mockReturnValue('orc-fixo') };
    usecase = new LancarOrcamentoAdicional(
      ordens,
      orcador as unknown as OrcadorDeItens,
      eventos,
      idGenerator,
    );
  });

  it('cria um orçamento ADICIONAL enviado e publica os eventos', async () => {
    ordens.buscarPorId.mockResolvedValue(osEmExecucao());

    const ordem = await usecase.executar({
      ordemId: 'os-1',
      descricao: 'Correia gasta',
      servicos: [{ servicoId: 's2', quantidade: 1 }],
      pecas: [],
    });

    const adicional = ordem.orcamentos.find(
      (o) => o.tipo === TipoOrcamento.ADICIONAL,
    );
    expect(adicional?.total).toBe(80);
    expect(ordens.atualizar).toHaveBeenCalledWith(ordem);
    expect(eventos.publicar).toHaveBeenCalled();
  });

  it('rejeita quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await expect(
      usecase.executar({
        ordemId: 'x',
        descricao: 'y',
        servicos: [],
        pecas: [],
      }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('respeita a situação das peças montadas (DISPONIVEL)', async () => {
    orcador.orcarPecas.mockResolvedValue([
      {
        id: 'ip2',
        pecaId: 'p2',
        descricao: 'Correia',
        quantidade: 1,
        precoAplicado: 50,
        situacao: SituacaoPecaOrcada.DISPONIVEL,
      },
    ]);
    ordens.buscarPorId.mockResolvedValue(osEmExecucao());

    const ordem = await usecase.executar({
      ordemId: 'os-1',
      descricao: 'Correia',
      servicos: [{ servicoId: 's2', quantidade: 1 }],
      pecas: [{ pecaId: 'p2', quantidade: 1 }],
    });

    const adicional = ordem.orcamentos.find(
      (o) => o.tipo === TipoOrcamento.ADICIONAL,
    );
    expect(adicional?.pecas[0].situacao).toBe(SituacaoPecaOrcada.DISPONIVEL);
    expect(adicional?.total).toBe(130); // 80 + 50
  });
});
