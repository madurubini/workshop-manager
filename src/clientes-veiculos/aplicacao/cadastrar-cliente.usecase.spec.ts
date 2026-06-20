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
      salvar: jest.fn(),
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

  it('rejeita documento de cliente ATIVO com conflito', async () => {
    const ativo = Cliente.cadastrar({
      id: 'c-existente',
      documento: '52998224725',
      nome: 'Antiga',
    });
    repo.buscarPorDocumento.mockResolvedValue(ativo);

    await expect(
      usecase.executar({ documento: '52998224725', nome: 'Maria' }),
    ).rejects.toBeInstanceOf(ErroConflito);
    expect(repo.inserir).not.toHaveBeenCalled();
  });

  it('recadastra: reativa o cliente INATIVO em vez de criar outro', async () => {
    const inativo = Cliente.cadastrar({
      id: 'c-2',
      documento: '52998224725',
      nome: 'Antiga',
    });
    inativo.inativar();
    inativo.puxarEventos(); // limpa o evento do cadastro original
    repo.buscarPorDocumento.mockResolvedValue(inativo);

    const resultado = await usecase.executar({
      documento: '52998224725',
      nome: 'Nova',
      email: 'nova@email.com',
    });

    expect(resultado).toBe(inativo);
    expect(inativo.ativo).toBe(true);
    expect(inativo.nome).toBe('Nova');
    expect(repo.salvar).toHaveBeenCalledWith(inativo);
    expect(repo.inserir).not.toHaveBeenCalled();
    expect(eventos.publicar).toHaveBeenCalled();
  });
});
