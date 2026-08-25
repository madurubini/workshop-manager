import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '../guards/jwt.strategy';

export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
