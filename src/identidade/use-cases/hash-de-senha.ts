export const HASH_DE_SENHA = Symbol('HashDeSenha');

export interface HashDeSenha {
  comparar(senhaPlana: string, hash: string): Promise<boolean>;
  /** Gera o hash de uma senha em texto plano (no cadastro). */
  gerar(senhaPlana: string): Promise<string>;
}
