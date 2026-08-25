import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AcompanhamentoToken } from '../../use-cases/acompanhamento-token';

/** Marca o token como sendo de acompanhamento (e não um login de operador). */
const ESCOPO = 'acompanhamento';

interface PayloadAcompanhamento {
  osId: string;
  escopo: string;
}

/**
 * JWT curto com `{ osId, escopo }`. O escopo impede que um token de login de
 * operador seja aceito aqui, e vice-versa. Reusa o JWT_SECRET — um segredo
 * próprio seria mais seguro.
 */
@Injectable()
export class JwtAcompanhamentoToken implements AcompanhamentoToken {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async gerar(osId: string): Promise<string> {
    // expiresIn é duração ('7d'); o @nestjs/jwt v11 exige o tipo do `ms`.
    const expiresIn = this.config.get<string>(
      'ACOMPANHAMENTO_TOKEN_EXPIRES_IN',
      '7d',
    ) as StringValue;
    return this.jwt.signAsync({ osId, escopo: ESCOPO }, { expiresIn });
  }

  async verificar(token: string): Promise<{ osId: string } | null> {
    try {
      const payload = await this.jwt.verifyAsync<PayloadAcompanhamento>(token);
      if (payload?.escopo !== ESCOPO || typeof payload.osId !== 'string') {
        return null;
      }
      return { osId: payload.osId };
    } catch {
      return null;
    }
  }
}
