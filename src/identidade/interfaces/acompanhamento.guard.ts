import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ACOMPANHAMENTO_TOKEN, AcompanhamentoToken } from '../dominio/portas';

/**
 * Protege ações do cliente no acompanhamento (aprovar/recusar orçamento). Não
 * exige login de operador: valida o TOKEN DE ACOMPANHAMENTO (assinado, com
 * escopo de uma OS) e confere se o `osId` do token bate com o da URL — assim o
 * token de uma OS não serve para responder a OS de outra (sem IDOR).
 *
 * O token vem no header `Authorization: Bearer <token>` ou no query `?token=`.
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
      throw new UnauthorizedException('Token de acompanhamento ausente.');
    }

    const payload = await this.tokens.verificar(token);
    if (!payload) {
      throw new UnauthorizedException(
        'Token de acompanhamento inválido ou expirado.',
      );
    }

    if (payload.osId !== req.params?.osId) {
      throw new ForbiddenException('Token não corresponde a esta OS.');
    }

    return true;
  }
}
