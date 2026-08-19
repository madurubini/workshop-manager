import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErroNaoAutorizado } from '../../../compartilhado/erros/erros-dominio';
import { Papel } from '../../entities/usuario';
import { UsuarioAutenticado } from './jwt.strategy';
import { PAPEIS_CHAVE } from '../decorators/papeis.decorator';

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
      throw new ErroNaoAutorizado(
        'Acesso restrito: papel insuficiente para esta operação.',
        { papeisExigidos: exigidos },
      );
    }
    return true;
  }
}
