import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que protege as rotas administrativas. Aplicar com
 * `@UseGuards(JwtAuthGuard)` no controller ou rota.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
