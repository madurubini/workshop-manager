/**
 * Classe-base de entidade. Uma entidade tem identidade própria (id): duas
 * entidades são iguais quando têm o mesmo id, independentemente dos demais
 * atributos. Contrasta com objeto de valor, que é igual por conteúdo.
 */
export abstract class EntidadeBase<TId> {
  protected readonly _id: TId;

  constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  /** Igualdade por identidade (mesmo id e mesmo tipo de entidade). */
  igualA(outra?: EntidadeBase<TId>): boolean {
    if (outra === null || outra === undefined) {
      return false;
    }
    if (this === outra) {
      return true;
    }
    if (this.constructor !== outra.constructor) {
      return false;
    }
    return this._id === outra._id;
  }
}
