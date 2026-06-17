import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConteudoToken, GeradorDeToken, TokenGerado } from '../dominio/portas';

/** Adaptador @nestjs/jwt da porta GeradorDeToken. */
@Injectable()
export class JwtGeradorDeToken implements GeradorDeToken {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async gerar(conteudo: ConteudoToken): Promise<TokenGerado> {
    const accessToken = await this.jwt.signAsync(conteudo);
    return {
      accessToken,
      expiresIn: this.expiresInEmSegundos(),
    };
  }

  /** Converte "3600s" / "1h" / "3600" em segundos para o corpo da resposta. */
  private expiresInEmSegundos(): number {
    const bruto = this.config.get<string>('JWT_EXPIRES_IN', '3600s');
    const match = /^(\d+)\s*([smhd])?$/.exec(bruto.trim());
    if (!match) {
      return 3600;
    }
    const valor = Number(match[1]);
    const unidade = match[2] ?? 's';
    const fator = { s: 1, m: 60, h: 3600, d: 86400 }[unidade] ?? 1;
    return valor * fator;
  }
}
