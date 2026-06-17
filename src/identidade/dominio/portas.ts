import { Papel, Usuario } from './usuario';

/**
 * Portas (interfaces) do contexto Identidade. A camada de aplicação depende
 * apenas destas abstrações; a infraestrutura fornece as implementações
 * concretas (Prisma, bcrypt, JWT). Mantém o domínio livre de framework.
 */

export const USUARIO_REPOSITORY = Symbol('UsuarioRepository');

export interface UsuarioRepository {
  buscarPorUsername(username: string): Promise<Usuario | null>;
}

export const HASH_DE_SENHA = Symbol('HashDeSenha');

export interface HashDeSenha {
  comparar(senhaPlana: string, hash: string): Promise<boolean>;
}

export interface ConteudoToken {
  sub: string;
  username: string;
  papel: Papel;
}

export interface TokenGerado {
  accessToken: string;
  expiresIn: number;
}

export const GERADOR_DE_TOKEN = Symbol('GeradorDeToken');

export interface GeradorDeToken {
  gerar(conteudo: ConteudoToken): Promise<TokenGerado>;
}
