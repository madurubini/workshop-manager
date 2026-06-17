import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { Peca } from './peca';

describe('Peca', () => {
  it('cria com saldo e calcula disponível = físico - reservado', () => {
    const peca = Peca.restaurar('p1', {
      codigo: 'X',
      nome: 'Filtro',
      precoUnitario: 35,
      saldoFisico: 10,
      reservado: 3,
      ativo: true,
    });
    expect(peca.disponivel).toBe(7);
    expect(peca.temDisponivel(7)).toBe(true);
    expect(peca.temDisponivel(8)).toBe(false);
  });

  it('cria peça nova zerando reservado', () => {
    const peca = Peca.criar({
      id: 'p1',
      codigo: 'FILTRO',
      nome: 'Filtro',
      precoUnitario: 35,
      saldoFisico: 5,
    });
    expect(peca.reservado).toBe(0);
    expect(peca.disponivel).toBe(5);
    expect(peca.ativo).toBe(true);
  });

  it('valida código, nome e preço', () => {
    expect(() =>
      Peca.criar({ id: 'p', codigo: ' ', nome: 'x', precoUnitario: 1 }),
    ).toThrow(ErroValidacao);
    expect(() =>
      Peca.criar({ id: 'p', codigo: 'C', nome: ' ', precoUnitario: 1 }),
    ).toThrow(ErroValidacao);
    expect(() =>
      Peca.criar({ id: 'p', codigo: 'C', nome: 'x', precoUnitario: -1 }),
    ).toThrow(ErroValidacao);
  });
});
