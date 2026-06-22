import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CompartilhadoModule } from '../src/compartilhado/compartilhado.module';
import { PrismaService } from '../src/compartilhado/infraestrutura/prisma/prisma.service';
import { HealthModule } from '../src/health/health.module';

/**
 * E2E do health check. Substitui o PrismaService por um fake para exercitar os
 * dois caminhos da sonda — banco respondendo (200/up) e banco fora (503/down) —
 * sem depender de um Postgres real.
 */
describe('Health (e2e)', () => {
  let app: INestApplication;
  // O terminus tenta $runCommandRaw (Mongo) e, ao ver o erro do provider SQL,
  // cai para $queryRawUnsafe('SELECT 1') — reproduzimos esse caminho do Postgres.
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
});
