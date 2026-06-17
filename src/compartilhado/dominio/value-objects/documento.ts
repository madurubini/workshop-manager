import { ErroValidacao } from '../../erros/erros-dominio';
import { ObjetoDeValor } from './objeto-de-valor';

export type TipoDocumento = 'CPF' | 'CNPJ';

interface PropsDocumento {
  valor: string; // apenas dígitos
  tipo: TipoDocumento;
}

/**
 * Documento do cliente (CPF ou CNPJ). Value object que valida formato e
 * dígitos verificadores na construção — invariante do agregado Clientes e
 * Veículos. O tipo é inferido pelo número de dígitos (11 = CPF, 14 = CNPJ).
 */
export class Documento extends ObjetoDeValor<PropsDocumento> {
  private constructor(props: PropsDocumento) {
    super(props);
  }

  static criar(entrada: string): Documento {
    const digitos = (entrada ?? '').replace(/\D/g, '');

    if (digitos.length === 11) {
      if (!Documento.cpfValido(digitos)) {
        throw new ErroValidacao('CPF inválido.', { documento: entrada });
      }
      return new Documento({ valor: digitos, tipo: 'CPF' });
    }

    if (digitos.length === 14) {
      if (!Documento.cnpjValido(digitos)) {
        throw new ErroValidacao('CNPJ inválido.', { documento: entrada });
      }
      return new Documento({ valor: digitos, tipo: 'CNPJ' });
    }

    throw new ErroValidacao(
      'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos).',
      { documento: entrada },
    );
  }

  get valor(): string {
    return this.props.valor;
  }

  get tipo(): TipoDocumento {
    return this.props.tipo;
  }

  /** Versão formatada (com pontuação) para exibição. */
  get formatado(): string {
    const v = this.props.valor;
    return this.props.tipo === 'CPF'
      ? `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
      : `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
  }

  private static cpfValido(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) {
      return false;
    }
    const digito = (ateIndice: number, pesoInicial: number): number => {
      let soma = 0;
      for (let i = 0; i < ateIndice; i++) {
        soma += Number(cpf[i]) * (pesoInicial - i);
      }
      const resto = (soma * 10) % 11;
      return resto === 10 || resto === 11 ? 0 : resto;
    };
    return (
      digito(9, 10) === Number(cpf[9]) && digito(10, 11) === Number(cpf[10])
    );
  }

  private static cnpjValido(cnpj: string): boolean {
    if (/^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }
    const calcular = (base: string, pesos: number[]): number => {
      let soma = 0;
      for (let i = 0; i < pesos.length; i++) {
        soma += Number(base[i]) * pesos[i];
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1 = calcular(cnpj.slice(0, 12), pesos1);
    const d2 = calcular(cnpj.slice(0, 13), pesos2);
    return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
  }
}
