import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
} from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';
import { OrdemServicoRepository } from './ordem-servico.repositorio';
import { AlterarStatusDaOrdem } from './alterar-status.usecase';

function osRecebida(): OrdemServico {
  return OrdemServico.abrir({
    id: 'os-1',
    numero: 'OS-000001',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'Barulho',
  });
}

describe('AlterarStatusDaOrdem', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let usecase: AlterarStatusDaOrdem;

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
    usecase = new AlterarStatusDaOrdem(ordens, eventos);
  });

  it('move a OS para o status pedido, salva e publica', async () => {
    const os = osRecebida();
    ordens.buscarPorId.mockResolvedValue(os);

    const ordem = await usecase.executar({
      ordemId: 'os-1',
      status: StatusOS.EM_DIAGNOSTICO,
      por: 'gestor',
    });

    expect(ordem.status).toBe(StatusOS.EM_DIAGNOSTICO);
    expect(ordens.atualizar).toHaveBeenCalledWith(os);
    expect(eventos.publicar).toHaveBeenCalled();
  });

  it('registra no histórico quem fez a correção', async () => {
    const os = osRecebida();
    ordens.buscarPorId.mockResolvedValue(os);

    await usecase.executar({
      ordemId: 'os-1',
      status: StatusOS.CANCELADA,
      por: 'gestor',
    });

    const ultimo = os.historico[os.historico.length - 1];
    expect(ultimo.status).toBe(StatusOS.CANCELADA);
    expect(ultimo.por).toBe('gestor');
  });

  it('cancelar por aqui publica os-cancelada (o Estoque libera as encomendas)', async () => {
    const os = osRecebida();
    ordens.buscarPorId.mockResolvedValue(os);

    await usecase.executar({ ordemId: 'os-1', status: StatusOS.CANCELADA });

    const publicados = eventos.publicar.mock.calls[0].map((e) => e.nomeEvento);
    expect(publicados).toContain('ordem-servico.os-cancelada');
  });

  it('rejeita quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);

    await expect(
      usecase.executar({ ordemId: 'x', status: StatusOS.CANCELADA }),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('não fura a máquina de estados: pular etapa é transição inválida', async () => {
    const os = osRecebida();
    ordens.buscarPorId.mockResolvedValue(os);

    await expect(
      usecase.executar({ ordemId: 'os-1', status: StatusOS.FINALIZADA }),
    ).rejects.toBeInstanceOf(ErroTransicaoInvalida);
    expect(ordens.atualizar).not.toHaveBeenCalled();
  });

  it('não aceita repetir o status atual', async () => {
    const os = osRecebida();
    ordens.buscarPorId.mockResolvedValue(os);

    await expect(
      usecase.executar({ ordemId: 'os-1', status: StatusOS.RECEBIDA }),
    ).rejects.toBeInstanceOf(ErroTransicaoInvalida);
  });
});
