# Database conventions

Decided once, in Phase 0A, before any domain table exists — retrofitting a
naming or key strategy after real data exists is a much more expensive
migration than picking one up front.

## Primary keys: UUID, not auto-increment

Every entity extends `src/database/base.entity.ts`, which provides
`id: string` as a `uuid` primary key (via Postgres's `gen_random_uuid()`,
enabled by the baseline migration), plus `createdAt` / `updatedAt` /
`deletedAt`.

Why UUID over a serial integer: this is a multi-university system from day
one. Sequential integer IDs are enumerable (`/courses/1042` invites probing
`1041`, `1043`, ...) and collide if data from different environments or
sources is ever merged. UUIDs sidestep both.

## Naming: snake_case in Postgres, camelCase in TypeScript

`src/database/snake-case-naming.strategy.ts` translates every entity
property and class name to snake_case for the actual table/column names
(`universityId` → `university_id`, `CourseOffering` → `course_offering`),
while entity code stays idiomatic camelCase TypeScript. This is applied
automatically — a new entity doesn't need to specify `@Column({ name: ... })`
just to get a consistent database-side name.

## Soft deletes by default

`deletedAt` on the base entity enables TypeORM's `softRemove` / `softDelete`.
Prefer soft deletes for academic records (a mistakenly "deleted" course
enrollment or resource should be recoverable, and audit history — coming in
a later phase — needs the row to still exist). Use a real hard delete only
where there's a specific reason to (e.g. GDPR/NDPR-style erasure requests),
and document that reason at the call site when it happens.

## Migrations only — never `synchronize: true`

`DatabaseModule` sets `synchronize: false` unconditionally. Schema changes
happen exclusively through reviewed migrations in `src/database/migrations/`,
generated with `npm run migration:generate` and applied with
`npm run migration:run`. `synchronize: true` (TypeORM auto-diffing entities
against the live schema) is convenient in tutorials and dangerous in
anything with real data — it has no history, no review step, and can drop
columns/tables without asking.

`src/database/data-source.ts` is a second, standalone TypeORM connection
config used only by the migration CLI (it can't go through Nest's
`ConfigService` because the CLI runs outside Nest's DI container). Keep it
in sync with `database.module.ts` if the connection options ever change.

## What Phase 0A deliberately did NOT create

No domain tables — no `users`, `universities`, `faculties`, `courses`,
nothing. The only migration in this phase (`BaselineExtensions...`) enables
the `pgcrypto` and `uuid-ossp` Postgres extensions that UUID primary keys
depend on, and creates no tables at all. The full hierarchy (University →
Faculty → Department → Programme → Level → Course) belongs to the phases
that actually implement those domains.

## Test database

`docker-compose.yml` provisions two local databases from one Postgres
container: `nigerian_student_platform_dev` (via `POSTGRES_DB`) and
`nigerian_student_platform_test` (via
`docker/postgres-init/01-create-test-db.sql`, which only runs against a
fresh, empty data volume). Point `DATABASE_NAME` at the test database in
whatever env file/CI config runs `npm run test:e2e`, so e2e runs never touch
development data.
