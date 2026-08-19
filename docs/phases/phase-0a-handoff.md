# Phase 0A Handoff — Secure & Scalable Backend Foundation

**Status:** Implemented and fully verified, including e2e. Four
verification rounds applied so far — a dependency fix (round 1), a
lint/code-quality fix (round 2), a lint correction (round 3) that ran
`npm install`, `npm run lint`, `npm run build`, and `npm run test`
in-sandbox and confirmed all four pass, and a TypeScript correction to
the e2e suite (round 4, below) that fixed the one remaining compile
error and confirmed `npm run test:e2e` passes against real Postgres and
Redis. All four verification commands, including e2e, now pass.

## Verification round 4 — e2e TypeScript correction (this update)

Round 3 (below) confirmed `npm install`, `npm run lint`, `npm run build`,
and `npm run test` all pass, but `npm run test:e2e` had never been run in
any sandbox. Running it for the first time this round surfaced one
TypeScript compilation error (the suite never got as far as executing):

- **`test/app.e2e-spec.ts` (error)** — `@nestjs/terminus`'s
  `HealthCheckResult.info` is typed `Partial<TDetails> | undefined`, and
  mapping `Partial<>` over an indicator record's indexed shape makes each
  entry `{ status: ... } | undefined` too, not just `info` itself. The
  existing `body.info?.database.status` only guarded `info`, not
  `database`, so `database` was still possibly `undefined` per the
  compiler (`TS18048`) — same for `redis`. Fixed by adding a small
  TypeScript assertion function, `assertDefined`, local to the spec file:
  it narrows the compiler's type for `info`, `info.database`, and
  `info.redis` to non-undefined before their `.status` is read, and
  throws with a specific message if any of them is genuinely absent — so
  a missing indicator still fails the test (with a clearer message than
  a bare equality mismatch), it's just no longer a compile error. No
  assertions were removed or weakened; the suite still requires database
  and Redis to both report `'up'`.

No `eslint-disable` comments, `as any`, or rule changes were used; no
tests were removed, skipped, or weakened; no application, `DatabaseModule`,
`RedisModule`, or production code changed.

**Verified in-sandbox this round, against a real local PostgreSQL 16 and
Redis 7 (not mocked, not Docker — installed directly via `apt` and
started locally, using the same host/port/credential defaults as
`docker-compose.yml`/`.env.example`):**

```
npm run lint     → 0 errors, 0 warnings
npm run build    → clean (nest build)
npm run test     → 8 suites, 30 tests, all passing
npm run test:e2e → 2 suites, 7 tests, all passing
```

`npm run test:e2e` result breakdown: no TypeScript/test-compilation
failures, no application startup failures, no PostgreSQL connectivity
failures, no Redis connectivity failures, and no assertion failures —
all 7 tests (4 in `app.e2e-spec.ts`, 3 in `validation.e2e-spec.ts`)
passed outright, including the database and Redis health-indicator
assertions against real connections.

## Verification round 3 — final lint correction

Round 2 (below) fixed 16 errors/9 warnings by static inspection only, in
a sandbox with no way to actually run ESLint against installed
`@typescript-eslint` type information. A real `npm run lint` this round
— first time actually executed — found round 2 had not fully closed the
gap: **2 errors and 7 warnings remained**, all real typing gaps, not
false positives:

- **`src/config/env.validation.ts` (error)** — round 2 asserted the
  *whole* `.validate()` call result to `Joi.ValidationResult<ValidatedEnv>`
  and then destructured `{ error, value }` from it in one statement. That
  doesn't work: `Joi.ValidationResult<T>` is a union of a success branch
  (`value: T`) and an error branch whose `value` Joi's own type declares
  as `any` — and a union containing `any` collapses to `any`, so the
  destructured `value` was still `any` regardless of the cast. Fixed at
  the actual source: `Joi.object<ValidatedEnv>({...})` now parameterizes
  the schema itself, and `validate()` checks `result.error` and only
  reads `result.value` afterwards (not via destructuring), so
  control-flow narrowing — not a cast — gives the success branch its real
  `ValidatedEnv` type.
- **`src/common/filters/global-exception.filter.spec.ts` (error)** — one
  assertion nests `expect.stringMatching(...)` as an object-literal
  property value; `@types/jest` declares that function's return as `any`
  (it's an asymmetric matcher, not a real string), which is unsafe to
  assign into a property. Cast that one expression to `string` at the
  point it's produced — it does stand in for a string here — rather than
  changing the assertion pattern.
- **`test/app.e2e-spec.ts`** (4 warnings) **and `test/validation.e2e-spec.ts`**
  (3 warnings) — in both files `app` was typed as the bare
  `INestApplication`, whose `TServer` generic defaults to `any`, so
  `app.getHttpServer()` — passed straight into supertest's `request()` —
  was an unsafe `any` argument every time. Typed `app` as
  `INestApplication<Server>` (Node's `http.Server`, imported from
  `'http'` — the same type `NestExpressApplication` itself resolves to
  by default) in both files, so `getHttpServer()` now returns a real
  `Server` and satisfies supertest's `App` type without a cast.

No `eslint-disable` comments, `as any`, or rule changes were used; no
tests were removed, skipped, or weakened; no architecture, dependency
versions, or domain behavior changed.

**Verified in-sandbox this round** (network access to the npm registry
was available, unlike prior rounds):

```
npm install   → 856 packages installed, 857 audited, 0 vulnerabilities
npm run lint  → 0 errors, 0 warnings
npm run build → clean (nest build)
npm run test  → 8 suites, 30 tests, all passing
```

`npm run test:e2e` was not run — it requires real Postgres/Redis via
`docker compose up -d`, and this sandbox has no Docker installed. (This
was resolved in round 4, above: e2e now passes, against a real local
Postgres/Redis installed without Docker.)

## Verification round 2 — lint / code-quality correction

`npm install` succeeded (856 packages, 0 vulnerabilities), but a real
`npm run lint` — run for the first time against actually-installed
`@typescript-eslint` type information, which no offline check in this
sandbox can reproduce — surfaced 16 errors and 9 warnings, all
`@typescript-eslint` `no-unsafe-*`/`require-await`/`no-unused-vars`
findings. None were style nitpicks; all traced back to a real gap in a
type or a real behavioral edge case. Fixed properly rather than
suppressed, file by file:

- **`src/config/env.validation.ts`** — Joi's `.validate()` return type
  isn't parameterized per call, so destructuring `{ error, value }` off it
  pulled `any` into both bindings. Added an exported `ValidatedEnv`
  interface describing the full validated-env shape this schema actually
  produces, and asserted the `.validate()` result to
  `Joi.ValidationResult<ValidatedEnv>` in one place, right where Joi's
  looser typing meets ours, instead of downstream.
- **`src/common/filters/global-exception.filter.ts`** — `statusCode` was
  inferred as the `HttpStatus` enum type from its initializer, then
  compared against a plain number literal (`statusCode >= 500`) after
  being reassigned from `exception.getStatus()` (which returns `number`,
  not `HttpStatus`). Explicitly typed it `number` — what it actually is —
  instead of leaving it as an enum type it didn't consistently hold.
  Interface also exported (`ErrorResponseBody`) so e2e tests can type
  against it instead of re-declaring or casting to `any`.
- **`src/storage/providers/null-storage.provider.ts`** — four methods were
  `async` with nothing to `await`. Removed `async` from all four (there's
  no asynchronous work, only a synchronous decision to reject) but kept
  them returning `Promise.reject(...)` rather than switching to a
  synchronous `throw` — a synchronous throw would have behaved differently
  for a caller using `.catch()`-style chaining instead of `await`/`try`.
  Same interface, same observable behavior, no `await` needed to satisfy.
- **`src/config/env.validation.spec.ts`** — a destructuring-based
  "omit one key" pattern (`const { DATABASE_HOST: _omit, ...rest } = ...`)
  left `_omit` unused; the leading underscore doesn't exempt it because
  this project's ESLint config only ignores unused *function arguments*
  matching `^_`, not unused local/destructured variables. Rewrote the test
  to build the same reduced object with `delete`, so there's no unused
  binding at all — left the ESLint config itself untouched rather than
  widen what it ignores.
- **`src/common/filters/global-exception.filter.spec.ts`** — one test read
  a captured mock argument directly (`jsonMock.mock.calls[0][0]`), which
  is `any` on an untyped `jest.Mock`. Rewrote it to use the same
  `toHaveBeenCalledWith(expect.objectContaining(...))` pattern already
  used by every other test in the file (with `expect.stringMatching(...)`
  for the ISO-timestamp check) — same assertion, no raw access.
- **`test/app.e2e-spec.ts`** and **`test/validation.e2e-spec.ts`** —
  supertest's `Response.body` is typed `any` (it can't know a server's
  response shape in advance), so every field read off it was flagged.
  Each test now casts `response.body` once, immediately after the
  request, to the real shape for that endpoint: `HealthCheckResult`
  (imported from `@nestjs/terminus` — not redeclared) for the health
  check, the already-exported `ErrorResponseBody` for the real app's error
  responses, and `SampleCreateDto` / a small local
  `ValidationErrorResponseBody` for the validation-only test module, which
  has no exception filter registered and so returns Nest's bare default
  error shape rather than `ErrorResponseBody`.

**Everything above was verified by reading the actual type definitions of
the packages involved** (Joi's `ValidationResult`, `@nestjs/terminus`'s
`HealthCheckResult`) via their published source, not assumed. Two offline
checks were re-run after every change: the same TypeScript-syntax parse
and import-resolution checks from Phase 0A and round 1 (still clean — see
below) — neither of which can substitute for `npm run lint`/`build`/`test`
actually running, which still hasn't happened here.

## Verification round 1 — dependency correction

A real local `npm install` against the original Phase 0A `package.json`
failed:

```
ERESOLVE unable to resolve dependency tree
Found: @nestjs/common@11.2.1
Could not resolve dependency:
peer @nestjs/common@"^9.0.0 || ^10.0.0" from @nestjs/swagger@8.1.1
```

**Cause:** `@nestjs/swagger` changed its versioning scheme at the same time
NestJS core reached v11 — instead of continuing its old v7/v8 numbering
(which lagged core by a couple of majors), it jumped to **v11.x to match
core's major version going forward**. `^8.0.0`, the range this project
started with, predates that change and only supports `@nestjs/common` v9/v10.

**Fix:** `@nestjs/swagger` bumped from `^8.0.0` to `^11.0.0` in
`package.json`. Nothing else changed — the three APIs this codebase
actually uses from the package (`DocumentBuilder`/`SwaggerModule` in
`src/bootstrap.ts`, `@ApiPropertyOptional` in
`src/common/dto/pagination-query.dto.ts`, `@ApiTags` in
`src/modules/health/health.controller.ts`) are long-stable, foundational
parts of its API and are unaffected by the v11 bump.

**Also checked, found already correct, left unchanged:** the other
`@nestjs/*` packages in this project's `package.json` — `terminus`
(`^11.0.0`), `throttler` (`^6.0.0`; its current 6.x line accepts
`@nestjs/common` v7 through v11), `typeorm` (`^11.0.0`), and `config`
(`^4.0.0`) — against their real, currently-published `peerDependencies`.
All are compatible with `@nestjs/common@^11`. This was verification only;
none of these version numbers changed.

**How this was verified:** by reading the actual published `package.json`
peer dependencies of each package (via web search against
registry/GitHub source, not from training-data memory of what "should" be
compatible — that guess is what caused the original bug). This is real
evidence about the packages themselves, which is different from actually
running `npm install` in this project — that still has not happened; see
below.

## Read this first: lint/build/test/e2e are all now verified

Rounds 0–2 were built in sandboxes with no network access, so
`npm run lint`, `npm run build`, and `npm run test` could not be executed
in any of them — only static checks (TypeScript syntax parsing,
import-resolution, and reading packages' real published type sources) and
one local `npm install` done by the person verifying this. **Round 3 had
npm registry access and actually ran `npm install`, `npm run lint`,
`npm run build`, and `npm run test` — all four pass. Round 4 (above) then
fixed a TypeScript compile error in the e2e suite and ran
`npm run test:e2e` against a real Postgres and Redis — it passes too, 7/7
tests across both e2e spec files.**

Nothing outstanding remains from local verification. If you want to
confirm it yourself, or exercise the running server manually:

```bash
docker compose up -d
npm run migration:run
npm run test:e2e
npm run start:dev   # then check GET /api/v1/health and /api/docs manually
```

## Source documents

This phase was built from a 13-file architecture/roadmap package (product
spec, roles & permissions, technical architecture, multi-university
architecture, database architecture, security architecture, feature
architecture, AI architecture, build roadmap, definition of done, Claude
execution instructions, first-build checklist) supplied as the project's
master source of truth, plus a chat-specific brief scoping this session to
"Phase 0A" only. If the next session has access to the same architecture
package, re-read it — this handoff summarizes the decisions made from it, not
the full content.

## What Phase 0A delivered

A NestJS + TypeScript backend foundation: project scaffold, environment
configuration with fail-fast validation, PostgreSQL via TypeORM (connection +
migrations, no domain schema yet), Redis via ioredis, API conventions
(`/api/v1`, global validation, pagination shape), a security baseline
(helmet, CORS, rate limiting, safe error responses), structured logging
(pino, with redaction), centralized error handling, an object-storage
abstraction (S3-compatible, presigned-URL-only, not wired to any endpoint
yet), and a testing foundation (9 unit spec files + 2 e2e spec files). One
real feature module — health checks — is implemented end-to-end as the
reference pattern for future modules.

### Definition of Done — status

- [x] NestJS backend foundation established
- [x] Project/module structure is clean
- [x] PostgreSQL integration implemented (connection, pooling, SSL toggle)
- [x] Migration system implemented (baseline migration + CLI data source)
- [x] Redis integration/foundation implemented (non-blocking connect, health check)
- [x] Environment configuration implemented (Joi schema, typed config factory)
- [x] Dev/test/staging/production configuration clearly separated (`NODE_ENV`-driven)
- [x] API versioning exists (URI versioning, `/api/v1`)
- [x] Global request validation exists (shared `ValidationPipe` factory)
- [x] Centralized error handling exists (`GlobalExceptionFilter`)
- [x] Security middleware baseline exists (helmet, CORS, safe error responses)
- [x] Rate-limiting foundation exists (`@nestjs/throttler`, global guard)
- [x] Structured logging exists (pino, request IDs, redaction)
- [x] Object-storage abstraction/foundation prepared (`IStorageProvider`, S3-compatible + null providers)
- [x] Testing infrastructure exists (Jest unit config + separate e2e config)
- [x] **Relevant foundation tests pass.** `npm install`, `npm run lint` (0 errors/0 warnings), `npm run build`, `npm run test` (8 suites, 30 tests), and `npm run test:e2e` (2 suites, 7 tests, against a real Postgres and Redis) all confirmed passing in-sandbox (rounds 3–4 — see above).
- [x] No real secrets committed (`.env.example` only; `.env*` gitignored)
- [x] No unrelated product features implemented (no domain entities/endpoints/business logic)
- [x] Architecture remains compatible with the supplied roadmap (no conflicts found — see "Judgment calls" below for the decisions that had to fill gaps the roadmap left open)
- [x] Documentation explains how to run and test the backend (`README.md`)

## Judgment calls made (nothing in the architecture docs specified these)

- **ORM: TypeORM**, not Prisma. Neither was mandated. TypeORM has the more
  direct official NestJS integration (`@nestjs/typeorm`) and decorator-based
  entities that match Nest's own style. Revisit if the team has a strong
  Prisma preference — nothing downstream depends on this in a way that would
  make switching expensive yet, since no domain entities exist.
- **No empty module folders for future domains.** The brief asked to
  "prepare the structure" for auth/users/universities/etc. while also
  warning against "empty/fake implementations merely to fill directories."
  This phase resolved that by writing one real reference module (`health/`)
  plus `docs/architecture/module-conventions.md` describing the pattern,
  instead of scaffolding fourteen empty ones. Full reasoning and the
  one-line change to do it the other way are in that doc.
- **No domain database tables at all**, not even a bare `users` table —
  kept the boundary with the next phase (Identity & Authentication) completely
  clean rather than guessing at a shape.
- **UUID primary keys + snake_case DB naming**, fixed now via a base entity
  and a custom TypeORM naming strategy, specifically so the first real domain
  migration doesn't also have to decide this. See
  `docs/architecture/database-conventions.md`.
- **Health check is versioned** (`/api/v1/health`) rather than exempted from
  the API prefix/version for infra probes. Simpler and consistent with
  everything else being versioned; making it version-neutral later is a
  small, isolated change if the team wants that instead.
- **Swagger UI defaults on outside production, off inside it** —
  `ENABLE_SWAGGER` is explicit in `.env` either way.

## What's next

Per the roadmap, the next phase is **Identity & Authentication** (the
roadmap's Phase 3 — student/staff accounts, password handling, sessions/
tokens), followed by RBAC. Both were explicitly out of scope here (see the
brief that scoped this chat to "Phase 0A"). Recommended entry point for that
session:

1. Read this document.
2. Read `docs/architecture/module-conventions.md` and
   `docs/architecture/database-conventions.md`.
3. Read the architecture package's security architecture doc for the
   authentication requirements (password hashing algorithm, token strategy,
   session handling) — this phase did not re-derive or summarize those
   requirements, only reserved config keys (`JWT_*`, commented out in
   `.env.example`) for them.
4. Run the verification steps at the top of this document if they haven't
   been run yet by anyone.

## Known limitations / explicitly deferred

Everything listed in the original brief's "do not build yet" section remains
undone by design: authentication, RBAC, university/faculty/department/
programme/course management, resources/PDF upload, timetable, rooms,
announcements, notifications, search, AI, gamification, analytics, and any
polished frontend. Also deferred: an actual Flutter or Next.js shell (this
chat's scope was backend-only).
