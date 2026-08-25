import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CompartilhadoModule } from '../src/compartilhado/compartilhado.module';
import { PrismaService } from '../src/compartilhado/infraestrutura/prisma/prisma.service';
import { HealthModule } from '../src/health/health.module';

/** Usa um PrismaService falso para exercitar os dois caminhos sem banco real. */
describe('Health (e2e)', () => {
  let app: INestApplication;
  // O terminus tenta $runCommandRaw (Mongo) e, ao falhar, cai para
  // $queryRawUnsafe('SELECT 1') — é esse caminho que reproduzimos.
  const prismaFake = {
    $runCommandRaw: jest
      .fn()
      .mockRejectedValue(new Error('Use the mongodb provider')),
    $queryRawUnsafe: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        CompartilhadoModule,
        HealthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaFake)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health retorna 200 e status "up" quando o banco responde', async () => {
    prismaFake.$queryRawUnsafe.mockResolvedValueOnce([{ '1': 1 }]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
  });

  it('GET /health retorna 503 quando o banco está inacessível', async () => {
    prismaFake.$queryRawUnsafe.mockRejectedValueOnce(
      new Error('connection refused'),
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);

    expect(res.body.status).toBe('error');
    expect(res.body.error.database.status).toBe('down');
  });

  it('GET /health/live responde 200 sem consultar o banco', async () => {
    prismaFake.$queryRawUnsafe.mockClear();

    const res = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200);

    expect(res.body.status).toBe('ok');
    // Se dependesse do banco, uma queda do Postgres reiniciaria réplicas sadias.
    expect(prismaFake.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('GET /health/ready retorna 200 quando o banco responde', async () => {
    prismaFake.$queryRawUnsafe.mockResolvedValueOnce([{ '1': 1 }]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(res.body.info.database.status).toBe('up');
  });

  it('GET /health/ready retorna 503 quando o banco está inacessível', async () => {
    prismaFake.$queryRawUnsafe.mockRejectedValueOnce(
      new Error('connection refused'),
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);

    expect(res.body.error.database.status).toBe('down');
  });
});
