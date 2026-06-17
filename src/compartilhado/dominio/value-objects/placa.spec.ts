import { ErroValidacao } from '../../erros/erros-dominio';
import { Placa } from './placa';

describe('Placa', () => {
  it('aceita placa no formato antigo (ABC1234)', () => {
    const placa = Placa.criar('ABC1234');
    expect(placa.formato).toBe('ANTIGO');
    expect(placa.valor).toBe('ABC1234');
  });

  it('aceita placa no formato Mercosul (ABC1D23)', () => {
    const placa = Placa.criar('ABC1D23');
    expect(placa.formato).toBe('MERCOSUL');
    expect(placa.valor).toBe('ABC1D23');
  });

  it('normaliza minúsculas e separadores', () => {
    expect(Placa.criar('abc-1234').valor).toBe('ABC1234');
    expect(Placa.criar(' abc1d23 ').valor).toBe('ABC1D23');
  });

  it('rejeita placa com formato inválido', () => {
    expect(() => Placa.criar('AB1234')).toThrow(ErroValidacao);
    expect(() => Placa.criar('1234ABC')).toThrow(ErroValidacao);
    expect(() => Placa.criar('ABCD123')).toThrow(ErroValidacao);
  });

  it('rejeita entrada vazia', () => {
    expect(() => Placa.criar('')).toThrow(ErroValidacao);
  });

  it('igualdade é por valor', () => {
    expect(Placa.criar('ABC1234').igualA(Placa.criar('abc-1234'))).toBe(true);
    expect(Placa.criar('ABC1234').igualA(Placa.criar('ABC1D23'))).toBe(false);
  });
});
