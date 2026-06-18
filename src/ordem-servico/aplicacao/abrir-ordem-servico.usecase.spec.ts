import { ClientesVeiculosApi } from '../../clientes-veiculos/aplicacao/clientes-veiculos.api';
import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { StatusOS } from '../dominio/status-os';
import { OrdemServicoRepository } from '../dominio/repositorios';
import { AbrirOrdemServico } from './abrir-ordem-servico.usecase';

describe('AbrirOrdemServico', () => {
  let ordens: jest.Mocked<OrdemServicoRepository>;
  let clientesVeiculos: jest.Mocked<ClientesVeiculosApi>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let usecase: AbrirOrdemServico;

  const entrada = {
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'Barulho na suspensão',
    por: 'recepcionista',
  };

  beforeEach(() => {
    ordens = {
      inserir: jest.fn(),
      atualizar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      proximoNumero: jest.fn().mockResolvedValue('OS-000001'),
      listarTemposExecucao: jest.fn(),
    };
    clientesVeiculos = {
      clienteExiste: jest.fn(),
      veiculoPertenceAoCliente: jest.fn(),
    };
    eventos = { publicar: jest.fn() };
    usecase = new AbrirOrdemServico(ordens, clientesVeiculos, eventos);
  });

  it('abre a OS quando cliente e veículo são válidos', async () => {
    clientesVeiculos.clienteExiste.mockResolvedValue(true);
    clientesVeiculos.veiculoPertenceAoCliente.mockResolvedValue(true);

    const ordem = await usecase.executar(entrada);

    expect(ordem.status).toBe(StatusOS.RECEBIDA);
    expect(ordem.numero).toBe('OS-000001');
    expect(ordens.inserir).toHaveBeenCalledWith(ordem);
    expect(eventos.publicar).toHaveBeenCalledTimes(1);
  });

  it('rejeita quando o cliente não existe (via porta pública)', async () => {
    clientesVeiculos.clienteExiste.mockResolvedValue(false);

    await expect(usecase.executar(entrada)).rejects.toBeInstanceOf(
      ErroNaoEncontrado,
    );
    expect(ordens.inserir).not.toHaveBeenCalled();
  });

  it('rejeita quando o veículo não pertence ao cliente', async () => {
    clientesVeiculos.clienteExiste.mockResolvedValue(true);
    clientesVeiculos.veiculoPertenceAoCliente.mockResolvedValue(false);

    await expect(usecase.executar(entrada)).rejects.toBeInstanceOf(
      ErroValidacao,
    );
    expect(ordens.inserir).not.toHaveBeenCalled();
  });
});
