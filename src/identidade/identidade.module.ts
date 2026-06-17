import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AutenticarUsuario } from './aplicacao/autenticar-usuario.usecase';
import { BcryptHashDeSenha } from './infraestrutura/bcrypt-hash-de-senha';
import { JwtGeradorDeToken } from './infraestrutura/jwt-gerador-de-token';
import { JwtStrategy } from './infraestrutura/jwt.strategy';
import { PrismaUsuarioRepository } from './infraestrutura/prisma-usuario.repository';
import {
  GERADOR_DE_TOKEN,
  HASH_DE_SENHA,
  USUARIO_REPOSITORY,
} from './dominio/portas';
import { AuthController } from './interfaces/auth.controller';

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
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '3600s'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AutenticarUsuario,
    JwtStrategy,
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
    { provide: HASH_DE_SENHA, useClass: BcryptHashDeSenha },
    { provide: GERADOR_DE_TOKEN, useClass: JwtGeradorDeToken },
  ],
  exports: [JwtModule, PassportModule],
})
export class IdentidadeModule {}
