import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FiltroExcecaoGlobal } from '../src/compartilhado/erros/filtro-excecao-global';
import { IdentidadeModule } from '../src/identidade/identidade.module';
import {
  HASH_DE_SENHA,
  USUARIO_REPOSITORY,
} from '../src/identidade/dominio/portas';
import { Usuario } from '../src/identidade/dominio/usuario';

/**
 * E2E do fluxo de autenticação. Substitui o repositório (Prisma) e o hash
 * (bcrypt) por fakes para validar o caminho HTTP completo — validação dos
 * DTOs, emissão real do JWT e envelope de erro — sem depender do Postgres.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  const usuario: Usuario = {
    id: 'uuid-1',
    username: 'gestor',
    senhaHash: 'hash',
    papel: 'GESTOR',
    ativo: true,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'segredo-teste';
    process.env.JWT_EXPIRES_IN = '3600s';

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), IdentidadeModule],
    })
      .overrideProvider(USUARIO_REPOSITORY)
      .useValue({
        buscarPorUsername: async (username: string) =>
          username === usuario.username ? usuario : null,
      })
      .overrideProvider(HASH_DE_SENHA)
      .useValue({
        comparar: async (senhaPlana: string) => senhaPlana === 'gestor123',
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new FiltroExcecaoGlobal());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login com credenciais válidas retorna 200 e o token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'gestor', senha: 'gestor123' })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.expiresIn).toBe(3600);
  });

  it('POST /auth/login com senha errada retorna 401 no envelope padrão', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'gestor', senha: 'errada' })
      .expect(401);

    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  it('POST /auth/login sem campos obrigatórios retorna 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({})
      .expect(400);

    expect(res.body.erro.codigo).toBe('VALIDACAO');
  });
});
