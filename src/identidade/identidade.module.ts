import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AutenticarUsuario } from './use-cases/autenticar-usuario.usecase';
import { CadastrarUsuario } from './use-cases/cadastrar-usuario.usecase';
import { USUARIO_REPOSITORY } from './use-cases/usuario.repositorio';
import { HASH_DE_SENHA } from './use-cases/hash-de-senha';
import { GERADOR_DE_TOKEN } from './use-cases/gerador-de-token';
import { ACOMPANHAMENTO_TOKEN } from './use-cases/acompanhamento-token';
import { BcryptHashDeSenha } from './adapters/gateways/bcrypt-hash-de-senha';
import { JwtAcompanhamentoToken } from './adapters/gateways/jwt-acompanhamento-token';
import { JwtGeradorDeToken } from './adapters/gateways/jwt-gerador-de-token';
import { PrismaUsuarioRepository } from './adapters/gateways/prisma-usuario.repositorio';
import { JwtStrategy } from './adapters/guards/jwt.strategy';
import { PapeisGuard } from './adapters/guards/papeis.guard';
import { AcompanhamentoGuard } from './adapters/guards/acompanhamento.guard';
import { AuthController } from './adapters/controllers/auth.controller';
import { UsuariosController } from './adapters/controllers/usuarios.controller';

/**
 * Contexto Identidade e Acesso (transversal às rotas administrativas).
 * Liga as portas do domínio às implementações de infraestrutura e expõe o
 * JwtStrategy/JwtAuthGuard para os demais módulos protegerem suas rotas.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '3600s',
          ) as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AutenticarUsuario,
    CadastrarUsuario,
    JwtStrategy,
    PapeisGuard,
    AcompanhamentoGuard,
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
    { provide: HASH_DE_SENHA, useClass: BcryptHashDeSenha },
    { provide: GERADOR_DE_TOKEN, useClass: JwtGeradorDeToken },
    { provide: ACOMPANHAMENTO_TOKEN, useClass: JwtAcompanhamentoToken },
  ],
  exports: [
    JwtModule,
    PassportModule,
    ACOMPANHAMENTO_TOKEN,
    AcompanhamentoGuard,
  ],
})
export class IdentidadeModule {}
