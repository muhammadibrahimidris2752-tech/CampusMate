# Module conventions

This backend is a modular monolith: one deployable process, organized into
self-contained domain modules under `src/modules/`, sharing a small set of
cross-cutting foundations.

## Where things live

| Concern | Location |
|---|---|
| Cross-cutting infrastructure (config, DB connection, Redis client, storage abstraction, global error handling, logging, pagination shape) | `src/config/`, `src/database/`, `src/redis/`, `src/storage/`, `src/common/` |
| A specific business domain (health, and later auth, users, universities, faculties, departments, programmes, courses, resources, timetable, rooms, announcements, notifications, search, AI, audit) | `src/modules/<domain>/` |

A domain module should be free to depend on the shared foundations, but two
domain modules should not reach into each other's internals — if
`courses` needs something from `programmes`, it depends on a service
`programmes` exports, not on `programmes`'s entities or repository directly.

## Why `src/modules/` only contains `health/` right now

The Phase 0A brief for this codebase listed the full set of future domains
(auth, users, universities, faculties, departments, programmes, courses,
resources, timetable, rooms, announcements, notifications, search, AI,
audit) as modules to "prepare the structure" for, while also explicitly
warning against "empty/fake implementations merely to fill directories."

Those two instructions are in tension for anything beyond a folder name: an
`@Module({})` with nothing in it, registered into `AppModule`, is exactly
the kind of scaffolding that provides no real value and can go stale or
guess wrong before the phase that actually needs it even starts (e.g. if
the auth phase decides `users` needs a different shape than a Phase 0A
guess would have produced). So this phase resolved the tension by doing the
structural part differently: one real, fully-implemented reference module
(`health/`) demonstrating the pattern, plus this document describing it —
instead of fourteen empty ones.

If your team's preference is the other way — literal empty folders/modules
as placeholders — that's a one-line-per-module change from here, not a
redesign; nothing about this decision blocks it.

## The pattern (using `health/` as the reference)

```
src/modules/<domain>/
  <domain>.module.ts        # @Module — imports, controllers, providers
  <domain>.controller.ts    # HTTP surface; thin — delegates to services
  <domain>.service.ts       # business logic (once there is any)
  dto/                      # request/response shapes, validated with class-validator
  entities/                 # TypeORM entities extending database/base.entity.ts
  indicators/                # only if the module has its own health checks, like health/
  *.spec.ts                 # unit tests beside the file they test
```

Registration: import the module into `src/app.module.ts`'s `imports`
array. Nothing else needs to change — `TypeOrmModule`'s `autoLoadEntities`
picks up new entities automatically, and the global validation pipe,
exception filter, and rate limiter already apply to every controller.

Routing: controllers inherit the global prefix and default API version
(`/api/v1/...`) unless there's a specific operational reason not to (as
`health` could have been made version-neutral for infrastructure probes,
but was deliberately kept versioned for consistency — see
`health.controller.ts`). Decide per-module, don't default to opting out.

## Multi-university scoping

No domain tables exist yet, but every future domain table that belongs to a
specific university (which is most of them — courses, resources, timetable,
rooms, announcements, ...) should carry a `university_id` column from its
first migration, and every query that lists or looks up that data should
filter by it. That enforcement point is naturally the authorization layer
being built in the next phase, not something Phase 0A can implement without
an identity system to scope against — but the column and the discipline of
never leaving it off is worth stating here before the first such table gets
written.
