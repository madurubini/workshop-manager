import { PublicadorDeEventos } from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroConflito,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../dominio/cliente';
import { ClienteRepository } from '../dominio/repositorios';
import { CadastrarCliente } from './cadastrar-cliente.usecase';

describe('CadastrarCliente', () => {
  let repo: jest.Mocked<ClienteRepository>;
  let eventos: jest.Mocked<PublicadorDeEventos>;
  let usecase: CadastrarCliente;

  beforeEach(() => {
    repo = {
      inserir: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorDocumento: jest.fn(),
      listar: jest.fn(),
    };
    eventos = { publicar: jest.fn() };
    usecase = new CadastrarCliente(repo, eventos);
  });

  it('cadastra cliente válido, persiste e publica evento', async () => {
    repo.buscarPorDocumento.mockResolvedValue(null);

    const cliente = await usecase.executar({
      documento: '529.982.247-25',
      nome: 'Maria',
    });

    expect(cliente).toBeInstanceOf(Cliente);
    expect(cliente.documento.valor).toBe('52998224725');
    expect(repo.inserir).toHaveBeenCalledWith(cliente);
    expect(eventos.publicar).toHaveBeenCalledTimes(1);
  });

  it('rejeita documento inválido antes de tocar o repositório', async () => {
    await expect(
      usecase.executar({ documento: '111', nome: 'Maria' }),
    ).rejects.toBeInstanceOf(ErroValidacao);
    expect(repo.buscarPorDocumento).not.toHaveBeenCalled();
  });

  it('rejeita documento duplicado com conflito', async () => {
    repo.buscarPorDocumento.mockResolvedValue({} as Cliente);

    await expect(
      usecase.executar({ documento: '52998224725', nome: 'Maria' }),
    ).rejects.toBeInstanceOf(ErroConflito);
    expect(repo.inserir).not.toHaveBeenCalled();
  });
});
