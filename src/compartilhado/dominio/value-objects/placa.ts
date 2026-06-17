import { ErroValidacao } from '../../erros/erros-dominio';
import { ObjetoDeValor } from './objeto-de-valor';

export type FormatoPlaca = 'ANTIGO' | 'MERCOSUL';

interface PropsPlaca {
  valor: string; // normalizada: maiúscula, sem separadores
  formato: FormatoPlaca;
}

const PADRAO_ANTIGO = /^[A-Z]{3}[0-9]{4}$/; // ABC1234
const PADRAO_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/; // ABC1D23

/**
 * Placa do veículo. Value object que valida o formato (modelo antigo
 * brasileiro e Mercosul) na construção — invariante do agregado Clientes e
 * Veículos. Normaliza para maiúsculas e remove hífen/espaços.
 */
export class Placa extends ObjetoDeValor<PropsPlaca> {
  private constructor(props: PropsPlaca) {
    super(props);
  }

  static criar(entrada: string): Placa {
    const normalizada = (entrada ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (PADRAO_ANTIGO.test(normalizada)) {
      return new Placa({ valor: normalizada, formato: 'ANTIGO' });
    }
    if (PADRAO_MERCOSUL.test(normalizada)) {
      return new Placa({ valor: normalizada, formato: 'MERCOSUL' });
    }

    throw new ErroValidacao(
      'Placa inválida. Use o formato ABC1234 (antigo) ou ABC1D23 (Mercosul).',
      { placa: entrada },
    );
  }

  get valor(): string {
    return this.props.valor;
  }

  get formato(): FormatoPlaca {
    return this.props.formato;
  }
}
