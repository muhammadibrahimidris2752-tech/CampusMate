# Nigerian Student Platform — Backend

NestJS + TypeScript backend for the Nigerian Student Platform. This repository
currently contains **Phase 0A — the secure & scalable backend foundation**:
configuration, PostgreSQL, Redis, API conventions, security baseline,
logging, error handling, validation, object-storage abstraction, and testing
infrastructure. It intentionally does not yet contain authentication, RBAC,
or any academic/product features — see
[`docs/phases/phase-0a-handoff.md`](docs/phases/phase-0a-handoff.md) for what
comes next and why.

The architecture, roadmap, and security principles this backend follows live
in the project's Architecture & Roadmap documents (supplied separately as the
source of truth) and are summarized for this codebase in
[`docs/architecture/`](docs/architecture).

## Tech stack

| Concern | Choice |
|---|---|
| Language | TypeScript |
| Framework | NestJS (modular monolith) |
| Database | PostgreSQL, via TypeORM |
| Cache / future queues | Redis, via ioredis |
| Object storage | S3-compatible (AWS S3, DigitalOcean Spaces, Cloudflare R2, MinIO) |
| Validation | class-validator / class-transformer |
| Logging | pino (structured JSON), via nestjs-pino |
| API docs | OpenAPI, via @nestjs/swagger |

## Prerequisites

- Node.js 20+
- Docker (for local Postgres + Redis — or point at your own instances)

## Getting started

```bash
cp .env.example .env         # then fill in local values if you're not using the defaults below
docker compose up -d         # starts Postgres (5432) + Redis (6379) with matching defaults
npm install
npm run migration:run        # applies the Phase 0A baseline migration
npm run start:dev
```

The API is now running at `http://localhost:3000/api/v1`.
Health check: `GET http://localhost:3000/api/v1/health`.
OpenAPI docs (enabled by default outside production): `http://localhost:3000/api/docs`.

## Environment configuration

All configuration is environment-variable driven — see
[`.env.example`](.env.example) for the full list with explanations. The app
validates its environment at startup (`src/config/env.validation.ts`) and
**refuses to start** if required configuration is missing or unsafe (e.g. a
wildcard CORS origin in production) rather than falling back to insecure
defaults.

Never commit a real `.env` file — only `.env.example` is tracked.

## Available scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run the API with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run test` | Unit tests |
| `npm run test:cov` | Unit tests with coverage |
| `npm run test:e2e` | End-to-end tests (needs Postgres + Redis reachable — see below) |
| `npm run migration:generate -- src/database/migrations/<Name>` | Generate a migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Roll back the last migration |

## Testing

- **Unit tests** (`npm run test`) live beside the code they test (`*.spec.ts`
  in `src/`) and mock their infrastructure dependencies (Postgres, Redis,
  the S3 SDK) — they don't need Docker running.
- **End-to-end tests** (`npm run test:e2e`) boot the real application,
  including real Postgres and Redis connections, to prove those integrations
  actually work — not mocked. Run `docker compose up -d` first. They also
  cover the global validation pipe, security headers, CORS, and the
  standardized error response shape.

## Project structure

```
src/
  main.ts                    application entrypoint
  bootstrap.ts                app configuration shared by main.ts and e2e tests
  app.module.ts                root module
  config/                      environment validation + typed configuration
  common/                      cross-cutting concerns: exception filter, logger,
                                pagination DTOs, the global validation pipe
  database/                    TypeORM setup, naming strategy, base entity, migrations
  redis/                       Redis client wrapper
  storage/                     object storage abstraction (S3-compatible)
  modules/
    health/                    the one implemented feature module — see
                                docs/architecture/module-conventions.md for the
                                pattern future modules (auth, users,
                                universities, courses, ...) will follow
docs/
  architecture/                 conventions this codebase follows and why
  phases/                       per-checkpoint handoff documents
test/                           e2e tests
```

## Data-minimization note

Per the platform's product architecture, the backend must never store or
return exam results, CGPA/GPA, medical, or banking/financial information
unless a future, explicit specification change says otherwise. This applies
to every future module, not just Phase 0A.
