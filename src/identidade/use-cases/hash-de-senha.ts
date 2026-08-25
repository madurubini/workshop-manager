export const HASH_DE_SENHA = Symbol('HashDeSenha');

export interface HashDeSenha {
  comparar(senhaPlana: string, hash: string): Promise<boolean>;
  gerar(senhaPlana: string): Promise<string>;
}
