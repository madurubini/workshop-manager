import {
  ErroConflito,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
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

  describe('reservar', () => {
    function peca(saldo: number, reservado = 0): Peca {
      return Peca.restaurar('p1', {
        codigo: 'X',
        nome: 'Filtro',
        precoUnitario: 35,
        saldoFisico: saldo,
        reservado,
        ativo: true,
      });
    }

    it('reserva dentro do disponível (sobe o reservado, mantém o físico)', () => {
      const p = peca(10);
      p.reservar(4);
      expect(p.reservado).toBe(4);
      expect(p.saldoFisico).toBe(10);
      expect(p.disponivel).toBe(6);
    });

    it('NUNCA reserva acima do disponível', () => {
      const p = peca(10, 8); // disponível 2
      expect(() => p.reservar(3)).toThrow(ErroConflito);
      expect(p.reservado).toBe(8); // inalterado
    });

    it('rejeita quantidade não positiva', () => {
      expect(() => peca(10).reservar(0)).toThrow(ErroValidacao);
    });
  });

  describe('baixar', () => {
    function peca(saldo: number, reservado: number): Peca {
      return Peca.restaurar('p1', {
        codigo: 'X',
        nome: 'Filtro',
        precoUnitario: 35,
        saldoFisico: saldo,
        reservado,
        ativo: true,
      });
    }

    it('baixa do reservado (reduz reservado e físico)', () => {
      const p = peca(10, 4);
      p.baixar(4);
      expect(p.reservado).toBe(0);
      expect(p.saldoFisico).toBe(6);
    });

    it('não baixa mais do que o reservado', () => {
      const p = peca(10, 4);
      expect(() => p.baixar(5)).toThrow(ErroConflito);
    });
  });

  describe('ajustarSaldo', () => {
    function peca(saldo: number, reservado = 0): Peca {
      return Peca.restaurar('p1', {
        codigo: 'X',
        nome: 'Filtro',
        precoUnitario: 35,
        saldoFisico: saldo,
        reservado,
        ativo: true,
      });
    }

    it('entrada aumenta o saldo físico', () => {
      const p = peca(10);
      p.ajustarSaldo('ENTRADA', 5);
      expect(p.saldoFisico).toBe(15);
    });

    it('saída reduz o saldo físico', () => {
      const p = peca(10);
      p.ajustarSaldo('SAIDA', 4);
      expect(p.saldoFisico).toBe(6);
    });

    it('saída não pode deixar o saldo abaixo do reservado', () => {
      const p = peca(10, 8); // disponível 2
      expect(() => p.ajustarSaldo('SAIDA', 3)).toThrow(ErroConflito);
      expect(p.saldoFisico).toBe(10);
    });

    it('rejeita quantidade não positiva', () => {
      expect(() => peca(10).ajustarSaldo('ENTRADA', 0)).toThrow(ErroValidacao);
    });
  });

  describe('atualizarDados e inativar', () => {
    function peca(): Peca {
      return Peca.criar({
        id: 'p1',
        codigo: 'X',
        nome: 'Filtro',
        precoUnitario: 35,
      });
    }

    it('atualiza nome e preço', () => {
      const p = peca();
      p.atualizarDados({ nome: 'Filtro novo', precoUnitario: 40 });
      expect(p.nome).toBe('Filtro novo');
      expect(p.precoUnitario).toBe(40);
    });

    it('rejeita preço negativo', () => {
      expect(() => peca().atualizarDados({ precoUnitario: -1 })).toThrow(
        ErroValidacao,
      );
    });

    it('inativa', () => {
      const p = peca();
      p.inativar();
      expect(p.ativo).toBe(false);
    });
  });
});
