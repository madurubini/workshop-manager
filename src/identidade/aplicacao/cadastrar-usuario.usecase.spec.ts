import {
  ErroConflito,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { Usuario } from '../dominio/usuario';
import { HashDeSenha, UsuarioRepository } from '../dominio/portas';
import { CadastrarUsuario } from './cadastrar-usuario.usecase';

describe('CadastrarUsuario', () => {
  let repo: jest.Mocked<UsuarioRepository>;
  let hash: jest.Mocked<HashDeSenha>;
  let usecase: CadastrarUsuario;

  beforeEach(() => {
    repo = { buscarPorUsername: jest.fn(), inserir: jest.fn() };
    hash = {
      comparar: jest.fn(),
      gerar: jest.fn().mockResolvedValue('hash-da-senha'),
    };
    usecase = new CadastrarUsuario(repo, hash);
  });

  it('cadastra um usuário novo, gravando apenas o hash da senha', async () => {
    repo.buscarPorUsername.mockResolvedValue(null);

    const criado = await usecase.executar({
      username: 'recepcao01',
      senha: 'senhaForte123',
      papel: 'RECEPCIONISTA',
    });

    expect(hash.gerar).toHaveBeenCalledWith('senhaForte123');
    const persistido = repo.inserir.mock.calls[0][0] as Usuario;
    expect(persistido.senhaHash).toBe('hash-da-senha');
    expect(persistido.papel).toBe('RECEPCIONISTA');
    expect(persistido.ativo).toBe(true);
    // a resposta não expõe o hash
    expect(criado).toEqual(
      expect.objectContaining({
        username: 'recepcao01',
        papel: 'RECEPCIONISTA',
      }),
    );
    expect(criado).not.toHaveProperty('senhaHash');
  });

  it('rejeita username duplicado (409)', async () => {
    repo.buscarPorUsername.mockResolvedValue({
      id: 'u1',
      username: 'gestor',
      senhaHash: 'h',
      papel: 'GESTOR',
      ativo: true,
    });

    await expect(
      usecase.executar({
        username: 'gestor',
        senha: 'abcdef',
        papel: 'GESTOR',
      }),
    ).rejects.toBeInstanceOf(ErroConflito);
    expect(repo.inserir).not.toHaveBeenCalled();
  });

  it('rejeita senha curta', async () => {
    repo.buscarPorUsername.mockResolvedValue(null);
    await expect(
      usecase.executar({ username: 'x', senha: '123', papel: 'MECANICO' }),
    ).rejects.toBeInstanceOf(ErroValidacao);
  });

  it('rejeita papel inválido', async () => {
    repo.buscarPorUsername.mockResolvedValue(null);
    await expect(
      usecase.executar({
        username: 'x',
        senha: 'abcdef',
        papel: 'ADMIN' as never,
      }),
    ).rejects.toBeInstanceOf(ErroValidacao);
  });
});
