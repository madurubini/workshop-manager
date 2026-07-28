import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { Servico } from './servico';

describe('Servico (entidade)', () => {
  it('cria serviço válido', () => {
    const s = Servico.criar({ id: 's1', nome: ' Troca ', precoBase: 120 });
    expect(s.nome).toBe('Troca');
    expect(s.precoBase).toBe(120);
    expect(s.ativo).toBe(true);
    expect(s.descricao).toBeNull();
  });

  it('valida nome e preço', () => {
    expect(() => Servico.criar({ id: 's', nome: ' ', precoBase: 1 })).toThrow(
      ErroValidacao,
    );
    expect(() => Servico.criar({ id: 's', nome: 'X', precoBase: -1 })).toThrow(
      ErroValidacao,
    );
  });

  it('inativa (soft delete)', () => {
    const s = Servico.criar({ id: 's1', nome: 'X', precoBase: 1 });
    s.inativar();
    expect(s.ativo).toBe(false);
  });

  it('atualiza dados', () => {
    const s = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    s.atualizarDados({ nome: 'Y', precoBase: 20, descricao: 'desc' });
    expect(s.nome).toBe('Y');
    expect(s.precoBase).toBe(20);
    expect(s.descricao).toBe('desc');
  });

  it('rejeita preço negativo na atualização', () => {
    const s = Servico.criar({ id: 's1', nome: 'X', precoBase: 10 });
    expect(() => s.atualizarDados({ precoBase: -1 })).toThrow(ErroValidacao);
  });
});
