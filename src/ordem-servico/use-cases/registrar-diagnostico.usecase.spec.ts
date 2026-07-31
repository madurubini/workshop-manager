import { GeradorDeId } from '../../compartilhado/dominio/gerador-de-id';
import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
} from '../../compartilhado/erros/erros-dominio';
import { SituacaoPecaOrcada, StatusOrcamento } from '../entities/itens';
import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';
import { OrdemServicoRepository } from './ordem-servico.repositorio';
import { OrcadorDeItens } from './orcador-de-itens.service';
import { RegistrarDiagnostico } from './registrar-diagnostico.usecase';

function osRecebida(): OrdemServico {
  return OrdemServico.abrir({
    id: 'os-1',
    numero: 'OS-000001',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'Barulho',
  });
}

function osEmDiagnostico(): OrdemServico {
  const os = osRecebida();
  os.iniciarDiagnostico();
  return os;
}

describe('RegistrarDiagnostico', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let orcador: jest.Mocked<
    Pick<OrcadorDeItens, 'orcarServicos' | 'orcarPecas'>
  >;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let idGenerator: jest.Mocked<GeradorDeId>;
  let usecase: RegistrarDiagnostico;

  beforeEach(() => {
    ordens = {
      inserir: jest.fn(),
      atualizar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      proximoNumero: jest.fn(),
      listarTemposExecucao: jest.fn(),
    };
    orcador = {
      orcarServicos: jest.fn().mockResolvedValue([
        {
          id: 'is1',
          servicoId: 's1',
          descricao: 'Troca de óleo',
          quantidade: 1,
          precoAplicado: 120,
        },
      ]),
      orcarPecas: jest.fn().mockResolvedValue([
        {
          id: 'ip1',
          pecaId: 'p1',
          descricao: 'Filtro',
          quantidade: 4,
          precoAplicado: 35,
          situacao: SituacaoPecaOrcada.DISPONIVEL,
        },
      ]),
    };
    eventos = { publicar: jest.fn() };
    idGenerator = { novo: jest.fn().mockReturnValue('orc-fixo') };
    usecase = new RegistrarDiagnostico(
      ordens,
      orcador as unknown as OrcadorDeItens,
      eventos,
      idGenerator,
    );
  });

  it('monta itens, gera e envia o orçamento e leva a OS para Aguardando aprovação', async () => {
    ordens.buscarPorId.mockResolvedValue(osEmDiagnostico());

    const ordem = await usecase.executar({
      ordemId: 'os-1',
      servicos: [{ servicoId: 's1', quantidade: 1 }],
      pecas: [{ pecaId: 'p1', quantidade: 4 }],
    });

    expect(ordem.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
    expect(ordem.orcamento?.total).toBe(260); // 120 + 4*35
    expect(ordem.orcamento?.status).toBe(StatusOrcamento.ENVIADO);
    expect(ordens.atualizar).toHaveBeenCalledWith(ordem);
    expect(eventos.publicar).toHaveBeenCalledTimes(1);
  });

  it('rejeita quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await expect(
      usecase.executar({ ordemId: 'x', servicos: [], pecas: [] }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('propaga a guarda da máquina de estados (diagnóstico não iniciado)', async () => {
    ordens.buscarPorId.mockResolvedValue(osRecebida());

    await expect(
      usecase.executar({
        ordemId: 'os-1',
        servicos: [{ servicoId: 's1', quantidade: 1 }],
        pecas: [{ pecaId: 'p1', quantidade: 4 }],
      }),
    ).rejects.toBeInstanceOf(ErroTransicaoInvalida);
  });
});
