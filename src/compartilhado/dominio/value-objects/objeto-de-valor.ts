/**
 * Classe-base de objeto de valor. Diferente de entidade, um VO não tem
 * identidade: dois VOs são iguais quando seus atributos são iguais. São
 * imutáveis e validam suas invariantes na construção.
 */
export abstract class ObjetoDeValor<TProps extends object> {
  protected readonly props: TProps;

  constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  /** Igualdade estrutural (por valor). */
  igualA(outro?: ObjetoDeValor<TProps>): boolean {
    if (outro === null || outro === undefined) {
      return false;
    }
    if (this.constructor !== outro.constructor) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(outro.props);
  }
}
