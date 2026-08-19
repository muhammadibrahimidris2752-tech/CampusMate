import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength } from 'class-validator';
import type { Server } from 'http';
import request from 'supertest';
import { createGlobalValidationPipe } from '../src/common/pipes/global-validation-pipe.factory';

/**
 * Exercises the exact global ValidationPipe policy the real app uses
 * (Step 10). Phase 0A has no real endpoint with a DTO yet to test this
 * against, so this file defines a small, self-contained, test-only
 * controller/DTO purely to drive requests through the shared validation
 * pipe factory — it is never imported by src/ and ships nowhere near the
 * real API surface.
 */
class SampleCreateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Type(() => Number)
  @IsInt()
  age!: number;
}

@Controller('test-only/validation-sample')
class ValidationSampleController {
  @Post()
  create(@Body() body: SampleCreateDto): SampleCreateDto {
    return body;
  }
}

/**
 * This test module registers no exception filter, so a ValidationPipe
 * failure comes back through Nest's own default handling — just
 * {statusCode, message, error}, without the path/timestamp/requestId
 * fields GlobalExceptionFilter adds for the real app (see
 * app.e2e-spec.ts, which goes through the real filter and types against
 * ErrorResponseBody instead).
 */
interface ValidationErrorResponseBody {
  statusCode: number;
  message: string[];
  error: string;
}

describe('Global ValidationPipe (e2e)', () => {
  // Typed INestApplication<Server> (Node's http.Server), not the bare
  // INestApplication whose TServer generic defaults to `any` — otherwise
  // app.getHttpServer() below would return `any` and every
  // request(app.getHttpServer()) call would be an unsafe argument.
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ValidationSampleController],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication<Server>>();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid payload and coerces numeric strings per the DTO type', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-only/validation-sample')
      .send({ name: 'Ada', age: '21' });
    const body = response.body as SampleCreateDto;

    expect(response.status).toBe(201);
    expect(body).toEqual({ name: 'Ada', age: 21 });
  });

  it('rejects a payload with properties not declared on the DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-only/validation-sample')
      .send({ name: 'Ada', age: 21, isAdmin: true });

    expect(response.status).toBe(400);
  });

  it('rejects a payload that fails a validation rule', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-only/validation-sample')
      .send({ name: 'A', age: 21 });
    const body = response.body as ValidationErrorResponseBody;

    expect(response.status).toBe(400);
    expect(body.message.join(' ')).toMatch(/name/i);
  });
});
