import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Only /health is exercised here (no external dependencies). /ready
 * requires a live Postgres — see docker-compose.yml — and is covered by
 * the same suite once DATABASE_URL points at a running instance in CI.
 */
describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://pdlc:pdlc@localhost:5432/pdlc?schema=public';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.AUTH_MODE = 'dev-stub';
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 without auth', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });
});
