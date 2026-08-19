import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckResult } from '@nestjs/terminus';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { ErrorResponseBody } from '../src/common/filters/global-exception.filter';

/**
 * Boots the real AppModule — same DatabaseModule, RedisModule, and
 * configureApp() as production. That means this suite needs a real
 * Postgres and Redis reachable using whatever DATABASE_ and REDIS_
 * variables are in the environment (.env, or .env.test — see README.md).
 *
 * Easiest local setup: `docker compose up -d` (starts both from
 * docker-compose.yml), then `npm run test:e2e`.
 *
 * This is intentional, not a gap: proving Postgres and Redis connectivity
 * for real (Step 11) is the point of these tests, not something to fake
 * with mocks the way the unit tests do.
 *
 * supertest's Response.body is typed `any` (it can't know your server's
 * response shape), so every test here casts it once, to the real response
 * type for that endpoint, instead of reading fields off an untyped value.
 *
 * `app` is typed INestApplication<Server> (Node's http.Server — the same
 * default NestExpressApplication itself resolves to) rather than the bare
 * INestApplication, whose TServer generic defaults to `any`. Left at the
 * default, app.getHttpServer() below would return `any` and every
 * request(app.getHttpServer()) call would be an unsafe argument.
 *
 * HealthCheckResult's `info` is typed as `Partial<TDetails> | undefined`
 * (see @nestjs/terminus), and mapping `Partial<>` over an indicator
 * record's indexed shape makes every entry `X | undefined` too, not just
 * `info` itself. So `body.info?.database.status` doesn't compile: `database`
 * is possibly undefined even once `info` is known to exist.
 *
 * `assertDefined` below is a TypeScript assertion function: calling it
 * narrows the compiler's type for that exact expression to non-undefined
 * for every line afterwards, and it throws (failing the test) with a
 * specific message if the value is genuinely absent — so a missing
 * indicator still fails the test, it just fails with a clearer message
 * than a bare equality mismatch against 'up' would give.
 */
function assertDefined<T>(value: T, label: string): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
  if (value === undefined || value === null) {
    throw new Error(`Expected ${label} to be present`);
  }
}

describe('Application (e2e)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds healthy at the versioned, prefixed health endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    const body = response.body as HealthCheckResult;

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');

    const { info } = body;
    assertDefined(info, 'health check info');
    assertDefined(info.database, 'info.database');
    assertDefined(info.redis, 'info.redis');

    expect(info.database.status).toBe('up');
    expect(info.redis.status).toBe('up');
  });

  it('returns the standard error shape for an unknown route', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    const body = response.body as ErrorResponseBody;

    expect(response.status).toBe(404);
    expect(body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        path: '/api/v1/does-not-exist',
      }),
    );
    expect(body.timestamp).toBeDefined();
  });

  it('sends a security-headers baseline and a request id on every response', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('rejects a disallowed CORS origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'https://not-an-allowed-origin.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
