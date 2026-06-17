import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
} from '../../compartilhado/erros/erros-dominio';
import { SituacaoItemPeca, StatusOrcamento } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import { StatusOS } from '../dominio/status-os';
import { OrdemServicoRepository } from '../dominio/repositorios';
import { MontadorDeItens } from './montador-de-itens.service';
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

describe('RegistrarDiagnostico', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let montador: jest.Mocked<
    Pick<MontadorDeItens, 'montarServicos' | 'montarPecas'>
  >;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let usecase: RegistrarDiagnostico;

  beforeEach(() => {
    ordens = {
      inserir: jest.fn(),
      atualizar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      proximoNumero: jest.fn(),
    };
    montador = {
      montarServicos: jest.fn().mockResolvedValue([
        {
          id: 'is1',
          servicoId: 's1',
          descricao: 'Troca de óleo',
          quantidade: 1,
          precoAplicado: 120,
          reparoId: null,
        },
      ]),
      montarPecas: jest.fn().mockResolvedValue([
        {
          id: 'ip1',
          pecaId: 'p1',
          descricao: 'Filtro',
          quantidade: 4,
          precoAplicado: 35,
          situacao: SituacaoItemPeca.DISPONIVEL,
          reparoId: null,
        },
      ]),
    };
    eventos = { publicar: jest.fn() };
    usecase = new RegistrarDiagnostico(
      ordens,
      montador as unknown as MontadorDeItens,
      eventos,
    );
  });

  it('monta itens, gera orçamento e leva a OS para Em diagnóstico', async () => {
    ordens.buscarPorId.mockResolvedValue(osRecebida());

    const ordem = await usecase.executar({
      ordemId: 'os-1',
      servicos: [{ servicoId: 's1', quantidade: 1 }],
      pecas: [{ pecaId: 'p1', quantidade: 4 }],
    });

    expect(ordem.status).toBe(StatusOS.EM_DIAGNOSTICO);
    expect(ordem.orcamento?.total).toBe(260); // 120 + 4*35
    expect(ordem.orcamento?.status).toBe(StatusOrcamento.GERADO);
    expect(ordens.atualizar).toHaveBeenCalledWith(ordem);
    expect(eventos.publicar).toHaveBeenCalledTimes(1);
  });

  it('rejeita quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await expect(
      usecase.executar({ ordemId: 'x', servicos: [], pecas: [] }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('propaga a guarda da máquina de estados (OS fora de Recebida)', async () => {
    const os = osRecebida();
    os.transicionarPara(StatusOS.EM_DIAGNOSTICO);
    ordens.buscarPorId.mockResolvedValue(os);

    await expect(
      usecase.executar({
        ordemId: 'os-1',
        servicos: [{ servicoId: 's1', quantidade: 1 }],
        pecas: [{ pecaId: 'p1', quantidade: 4 }],
      }),
    ).rejects.toBeInstanceOf(ErroTransicaoInvalida);
  });
});
