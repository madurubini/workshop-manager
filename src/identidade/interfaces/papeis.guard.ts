import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '../dominio/usuario';
import { UsuarioAutenticado } from '../infraestrutura/jwt.strategy';
import { PAPEIS_CHAVE } from './papeis.decorator';

/**
 * Autorização por papel. Roda DEPOIS do JwtAuthGuard (que coloca o usuário em
 * `request.user`). Se a rota não exige papel específico, libera; caso contrário,
 * só passa quem tem um dos papéis exigidos.
 */
@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Papel[] | undefined>(
      PAPEIS_CHAVE,
      [context.getHandler(), context.getClass()],
    );
    if (!exigidos || exigidos.length === 0) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>();
    const usuario = request.user;
    if (!usuario || !exigidos.includes(usuario.papel)) {
      throw new ForbiddenException(
        'Acesso restrito: papel insuficiente para esta operação.',
      );
    }
    return true;
  }
}
