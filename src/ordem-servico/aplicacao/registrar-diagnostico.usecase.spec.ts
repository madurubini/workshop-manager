import { CatalogoServicosApi } from '../../catalogo-servicos/aplicacao/catalogo-servicos.api';
import { EstoqueApi } from '../../estoque/aplicacao/estoque.api';
import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { SituacaoItemPeca, StatusOrcamento } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import { StatusOS } from '../dominio/status-os';
import { OrdemServicoRepository } from '../dominio/repositorios';
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
  let catalogo: jest.Mocked<CatalogoServicosApi>;
  let estoque: jest.Mocked<EstoqueApi>;
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
    catalogo = { buscarServico: jest.fn() };
    estoque = {
      verificarDisponibilidade: jest.fn(),
      solicitarCotacao: jest.fn(),
    };
    eventos = { publicar: jest.fn() };
    usecase = new RegistrarDiagnostico(ordens, catalogo, estoque, eventos);
  });

  it('congela preços, gera o orçamento e leva a OS para Em diagnóstico', async () => {
    ordens.buscarPorId.mockResolvedValue(osRecebida());
    catalogo.buscarServico.mockResolvedValue({
      id: 's1',
      nome: 'Troca de óleo',
      precoBase: 120,
    });
    estoque.verificarDisponibilidade.mockResolvedValue([
      {
        pecaId: 'p1',
        encontrada: true,
        nome: 'Filtro',
        precoUnitario: 35,
        disponivel: 10,
        suficiente: true,
      },
    ]);

    const ordem = await usecase.executar({
      ordemId: 'os-1',
      servicos: [{ servicoId: 's1', quantidade: 1 }],
      pecas: [{ pecaId: 'p1', quantidade: 4 }],
    });

    expect(ordem.status).toBe(StatusOS.EM_DIAGNOSTICO);
    expect(ordem.itensServico[0].precoAplicado).toBe(120);
    expect(ordem.itensPeca[0].situacao).toBe(SituacaoItemPeca.DISPONIVEL);
    expect(ordem.itensPeca[0].precoAplicado).toBe(35);
    // total = 1*120 (serviço) + 4*35 (peça) = 260
    expect(ordem.orcamento?.totalServicos).toBe(120);
    expect(ordem.orcamento?.totalPecas).toBe(140);
    expect(ordem.orcamento?.total).toBe(260);
    expect(ordem.orcamento?.status).toBe(StatusOrcamento.GERADO);
    // verificação é só leitura: não cotou peça disponível
    expect(estoque.solicitarCotacao).not.toHaveBeenCalled();
    expect(ordens.atualizar).toHaveBeenCalledWith(ordem);
    expect(eventos.publicar).toHaveBeenCalledTimes(1);
  });

  it('cota a peça em falta e congela o preço cotado (situação EM_COTACAO)', async () => {
    ordens.buscarPorId.mockResolvedValue(osRecebida());
    catalogo.buscarServico.mockResolvedValue({
      id: 's1',
      nome: 'Serviço',
      precoBase: 100,
    });
    estoque.verificarDisponibilidade.mockResolvedValue([
      {
        pecaId: 'p2',
        encontrada: true,
        nome: 'Pastilha',
        precoUnitario: 180,
        disponivel: 0,
        suficiente: false,
      },
    ]);
    estoque.solicitarCotacao.mockResolvedValue({
      preco: 198,
      prazoDias: 7,
      fornecedor: 'F',
    });

    const ordem = await usecase.executar({
      ordemId: 'os-1',
      servicos: [{ servicoId: 's1', quantidade: 1 }],
      pecas: [{ pecaId: 'p2', quantidade: 2 }],
    });

    expect(estoque.solicitarCotacao).toHaveBeenCalledWith('os-1', 'p2', 2);
    expect(ordem.itensPeca[0].situacao).toBe(SituacaoItemPeca.EM_COTACAO);
    expect(ordem.itensPeca[0].precoAplicado).toBe(198); // preço cotado, congelado
    expect(ordem.orcamento?.totalPecas).toBe(396);
  });

  it('rejeita quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await expect(
      usecase.executar({ ordemId: 'x', servicos: [], pecas: [] }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('rejeita serviço inexistente no catálogo', async () => {
    ordens.buscarPorId.mockResolvedValue(osRecebida());
    catalogo.buscarServico.mockResolvedValue(null);
    await expect(
      usecase.executar({
        ordemId: 'os-1',
        servicos: [{ servicoId: 'inexistente', quantidade: 1 }],
        pecas: [],
      }),
    ).rejects.toBeInstanceOf(ErroValidacao);
    expect(ordens.atualizar).not.toHaveBeenCalled();
  });

  it('rejeita peça inexistente no estoque', async () => {
    ordens.buscarPorId.mockResolvedValue(osRecebida());
    estoque.verificarDisponibilidade.mockResolvedValue([
      {
        pecaId: 'p9',
        encontrada: false,
        nome: '',
        precoUnitario: 0,
        disponivel: 0,
        suficiente: false,
      },
    ]);
    await expect(
      usecase.executar({
        ordemId: 'os-1',
        servicos: [],
        pecas: [{ pecaId: 'p9', quantidade: 1 }],
      }),
    ).rejects.toBeInstanceOf(ErroValidacao);
  });

  it('rejeita diagnóstico quando a OS não está em Recebida (máquina de estados)', async () => {
    const os = osRecebida();
    os.transicionarPara(StatusOS.EM_DIAGNOSTICO); // já saiu de Recebida
    ordens.buscarPorId.mockResolvedValue(os);
    catalogo.buscarServico.mockResolvedValue({
      id: 's1',
      nome: 'S',
      precoBase: 10,
    });
    estoque.verificarDisponibilidade.mockResolvedValue([]);

    await expect(
      usecase.executar({
        ordemId: 'os-1',
        servicos: [{ servicoId: 's1', quantidade: 1 }],
        pecas: [],
      }),
    ).rejects.toBeInstanceOf(ErroTransicaoInvalida);
  });
});
