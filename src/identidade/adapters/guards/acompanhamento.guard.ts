import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ErroNaoAutenticado,
  ErroNaoAutorizado,
} from '../../../compartilhado/erros/erros-dominio';
import {
  ACOMPANHAMENTO_TOKEN,
  AcompanhamentoToken,
} from '../../use-cases/acompanhamento-token';

/**
 * Em vez de login, valida o token de acompanhamento e confere se o `osId` dele
 * bate com o da URL: o token de uma OS não responde por outra (sem IDOR).
 * Aceita `Authorization: Bearer <token>` ou `?token=`.
 */
@Injectable()
export class AcompanhamentoGuard implements CanActivate {
  constructor(
    @Inject(ACOMPANHAMENTO_TOKEN)
    private readonly tokens: AcompanhamentoToken,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const header = req.headers?.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : (req.query?.token as string | undefined);

    if (!token) {
      throw new ErroNaoAutenticado('Token de acompanhamento ausente.');
    }

    const payload = await this.tokens.verificar(token);
    if (!payload) {
      throw new ErroNaoAutenticado(
        'Token de acompanhamento inválido ou expirado.',
      );
    }

    if (payload.osId !== req.params?.osId) {
      throw new ErroNaoAutorizado('Token não corresponde a esta OS.');
    }

    return true;
  }
}
