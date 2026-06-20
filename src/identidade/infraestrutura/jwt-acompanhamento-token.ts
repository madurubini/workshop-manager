import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AcompanhamentoToken } from '../dominio/portas';

/** Marca o token como sendo de acompanhamento (e não um login de operador). */
const ESCOPO = 'acompanhamento';

interface PayloadAcompanhamento {
  osId: string;
  escopo: string;
}

/**
 * Adaptador @nestjs/jwt da porta AcompanhamentoToken. Assina um JWT curto com
 * `{ osId, escopo }`. Reusa o JWT_SECRET (poderia ser um segredo próprio para
 * hardening). O `escopo` impede que um token de login de operador seja aceito
 * aqui — e vice-versa.
 */
@Injectable()
export class JwtAcompanhamentoToken implements AcompanhamentoToken {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async gerar(osId: string): Promise<string> {
    const expiresIn = this.config.get<string>(
      'ACOMPANHAMENTO_TOKEN_EXPIRES_IN',
      '7d',
    );
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
      // Token inválido, adulterado ou expirado.
      return null;
    }
  }
}
