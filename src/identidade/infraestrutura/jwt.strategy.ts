import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Papel } from '../dominio/usuario';

export interface UsuarioAutenticado {
  id: string;
  username: string;
  papel: Papel;
}

interface PayloadJwt {
  sub: string;
  username: string;
  papel: Papel;
}

/**
 * Valida o Bearer token nas rotas administrativas. O retorno vira
 * `request.user`, acessível via decorator `@UsuarioAtual()`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const segredo = config.get<string>('JWT_SECRET');
    if (!segredo) {
      throw new Error('JWT_SECRET não configurado.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: segredo,
    });
  }

  async validate(payload: PayloadJwt): Promise<UsuarioAutenticado> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token inválido.');
    }
    return {
      id: payload.sub,
      username: payload.username,
      papel: payload.papel,
    };
  }
}
