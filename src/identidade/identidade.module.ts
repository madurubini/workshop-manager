import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AutenticarUsuario } from './aplicacao/autenticar-usuario.usecase';
import { CadastrarUsuario } from './aplicacao/cadastrar-usuario.usecase';
import { BcryptHashDeSenha } from './infraestrutura/bcrypt-hash-de-senha';
import { JwtAcompanhamentoToken } from './infraestrutura/jwt-acompanhamento-token';
import { JwtGeradorDeToken } from './infraestrutura/jwt-gerador-de-token';
import { JwtStrategy } from './infraestrutura/jwt.strategy';
import { PrismaUsuarioRepository } from './infraestrutura/prisma-usuario.repository';
import {
  ACOMPANHAMENTO_TOKEN,
  GERADOR_DE_TOKEN,
  HASH_DE_SENHA,
  USUARIO_REPOSITORY,
} from './dominio/portas';
import { AcompanhamentoGuard } from './interfaces/acompanhamento.guard';
import { AuthController } from './interfaces/auth.controller';
import { PapeisGuard } from './interfaces/papeis.guard';
import { UsuariosController } from './interfaces/usuarios.controller';

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
