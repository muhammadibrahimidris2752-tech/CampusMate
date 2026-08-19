import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from '../config/config.types';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

/**
 * PostgreSQL foundation (Step 4).
 *
 * - `synchronize: false` always — schema only ever changes through
 *   reviewed migrations (see database/migrations and data-source.ts),
 *   never by TypeORM auto-diffing entities against the live schema.
 * - `autoLoadEntities: true` lets future feature modules register their
 *   entities via `TypeOrmModule.forFeature([...])` without this module
 *   needing to know about them — that's the multi-domain "modular
 *   monolith" boundary the architecture calls for.
 * - No entities are registered by Phase 0A itself. The connection is
 *   proven via the health module (Step 11), not by any domain table.
 * - Connection lifecycle (open/close) is managed by Nest; main.ts calls
 *   `app.enableShutdownHooks()` so the pool closes cleanly on SIGTERM.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const db = configService.get<DatabaseConfig>('database')!;
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.name,
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
          namingStrategy: new SnakeCaseNamingStrategy(),
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: false, // run explicitly via `npm run migration:run`, not on every boot
          logging: db.logging,
          extra: {
            max: db.poolMax,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
