import { Papel } from '../entities/usuario';

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
