export type Papel = 'RECEPCIONISTA' | 'MECANICO' | 'GESTOR';

/**
 * Usuário administrativo (operador interno) que acessa as APIs protegidas.
 * Entidade de leitura do contexto Identidade; a senha trafega apenas como hash.
 */
export interface Usuario {
  id: string;
  username: string;
  senhaHash: string;
  papel: Papel;
  ativo: boolean;
}
