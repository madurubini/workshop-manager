import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';
import { OrdemServicoRepository } from './ordem-servico.repositorio';
import { ConfirmarPagamento, EntregarVeiculo } from './entrega.usecases';

function osFinalizada(): OrdemServico {
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
  os.concluirExecucao('mecanico');
  os.puxarEventos();
  return os;
}

describe('Casos de uso de entrega', () => {
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

  it('ConfirmarPagamento marca pago e salva', async () => {
    const os = osFinalizada();
    ordens.buscarPorId.mockResolvedValue(os);

    await new ConfirmarPagamento(ordens, eventos).executar({ ordemId: 'os-1' });

    expect(os.pago).toBe(true);
    expect(ordens.atualizar).toHaveBeenCalledWith(os);
  });

  it('EntregarVeiculo após pago leva a OS para Entregue', async () => {
    const os = osFinalizada();
    os.marcarPago();
    os.puxarEventos();
    ordens.buscarPorId.mockResolvedValue(os);

    await new EntregarVeiculo(ordens, eventos).executar({ ordemId: 'os-1' });

    expect(os.status).toBe(StatusOS.ENTREGUE);
    expect(eventos.publicar).toHaveBeenCalled();
  });

  it('falha quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await expect(
      new ConfirmarPagamento(ordens, eventos).executar({ ordemId: 'x' }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
