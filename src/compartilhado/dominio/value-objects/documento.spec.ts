import { ErroValidacao } from '../../erros/erros-dominio';
import { Documento } from './documento';
import { Placa } from './placa';

describe('Documento (CPF/CNPJ)', () => {
  describe('CPF', () => {
    it('aceita CPF válido e expõe tipo/valor', () => {
      const doc = Documento.criar('529.982.247-25');
      expect(doc.tipo).toBe('CPF');
      expect(doc.valor).toBe('52998224725');
      expect(doc.formatado).toBe('529.982.247-25');
    });

    it('aceita CPF válido só com dígitos', () => {
      expect(Documento.criar('11144477735').tipo).toBe('CPF');
    });

    it('rejeita CPF com dígito verificador errado', () => {
      expect(() => Documento.criar('52998224724')).toThrow(ErroValidacao);
    });

    it('rejeita CPF com todos os dígitos iguais', () => {
      expect(() => Documento.criar('00000000000')).toThrow(ErroValidacao);
    });
  });

  describe('CNPJ', () => {
    it('aceita CNPJ válido e expõe tipo/valor/formatado', () => {
      const doc = Documento.criar('11.222.333/0001-81');
      expect(doc.tipo).toBe('CNPJ');
      expect(doc.valor).toBe('11222333000181');
      expect(doc.formatado).toBe('11.222.333/0001-81');
    });

    it('rejeita CNPJ com dígito verificador errado', () => {
      expect(() => Documento.criar('11222333000180')).toThrow(ErroValidacao);
    });

    it('rejeita CNPJ com todos os dígitos iguais', () => {
      expect(() => Documento.criar('00000000000000')).toThrow(ErroValidacao);
    });
  });

  it('rejeita documento com quantidade de dígitos inválida', () => {
    expect(() => Documento.criar('123')).toThrow(ErroValidacao);
  });

  it('rejeita entrada vazia', () => {
    expect(() => Documento.criar('')).toThrow(ErroValidacao);
  });

  it('igualdade é por valor', () => {
    const a = Documento.criar('529.982.247-25');
    const b = Documento.criar('52998224725');
    const c = Documento.criar('11144477735');
    expect(a.igualA(b)).toBe(true);
    expect(a.igualA(c)).toBe(false);
    expect(a.igualA(undefined)).toBe(false);
  });

  it('não é igual a um value object de outro tipo', () => {
    const doc = Documento.criar('52998224725');
    const placa = Placa.criar('ABC1234') as unknown as Documento;
    expect(doc.igualA(placa)).toBe(false);
  });
});
