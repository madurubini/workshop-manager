import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
} from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';
import { OrdemServicoRepository } from './ordem-servico.repositorio';
import { IniciarDiagnostico } from './iniciar-diagnostico.usecase';

function osRecebida(): OrdemServico {
  return OrdemServico.abrir({
    id: 'os-1',
    numero: 'OS-000001',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'Barulho',
  });
}

describe('IniciarDiagnostico', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let usecase: IniciarDiagnostico;

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
    usecase = new IniciarDiagnostico(ordens, eventos);
  });

  it('leva a OS de Recebida para Em diagnóstico, salva e publica', async () => {
    const os = osRecebida();
    ordens.buscarPorId.mockResolvedValue(os);

    const ordem = await usecase.executar({ ordemId: 'os-1', por: 'mecanico' });

    expect(ordem.status).toBe(StatusOS.EM_DIAGNOSTICO);
    expect(ordens.atualizar).toHaveBeenCalledWith(os);
    expect(eventos.publicar).toHaveBeenCalled();
  });

  it('rejeita quando a OS não existe', async () => {
    ordens.buscarPorId.mockResolvedValue(null);
    await expect(usecase.executar({ ordemId: 'x' })).rejects.toBeInstanceOf(
      ErroNaoEncontrado,
    );
  });

  it('propaga a guarda da máquina de estados (OS fora de Recebida)', async () => {
    const os = osRecebida();
    os.iniciarDiagnostico(); // já em Em diagnóstico
    ordens.buscarPorId.mockResolvedValue(os);

    await expect(usecase.executar({ ordemId: 'os-1' })).rejects.toBeInstanceOf(
      ErroTransicaoInvalida,
    );
  });
});
