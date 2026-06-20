import { Papel, Usuario } from './usuario';

/**
 * Portas (interfaces) do contexto Identidade. A camada de aplicação depende
 * apenas destas abstrações; a infraestrutura fornece as implementações
 * concretas (Prisma, bcrypt, JWT). Mantém o domínio livre de framework.
 */

export const USUARIO_REPOSITORY = Symbol('UsuarioRepository');

export interface UsuarioRepository {
  buscarPorUsername(username: string): Promise<Usuario | null>;
  /** Persiste um novo usuário administrativo. */
  inserir(usuario: Usuario): Promise<void>;
}

export const HASH_DE_SENHA = Symbol('HashDeSenha');

export interface HashDeSenha {
  comparar(senhaPlana: string, hash: string): Promise<boolean>;
  /** Gera o hash de uma senha em texto plano (no cadastro). */
  gerar(senhaPlana: string): Promise<string>;
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

export const ACOMPANHAMENTO_TOKEN = Symbol('AcompanhamentoToken');

/**
 * Token de acompanhamento: assinado, com ESCOPO de uma OS e validade. Não
 * representa um usuário — representa o direito de responder ao orçamento DAQUELA
 * OS. Vai no link enviado ao cliente; o cliente aprova/recusa sem ter conta.
 */
export interface AcompanhamentoToken {
  /** Gera o token assinado para uma OS (para montar o link do cliente). */
  gerar(osId: string): Promise<string>;
  /** Valida o token; devolve o osId, ou null se inválido/expirado/fora de escopo. */
  verificar(token: string): Promise<{ osId: string } | null>;
}
