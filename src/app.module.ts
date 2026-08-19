import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggerModule } from './common/logger/logger.module';
import { ThrottleConfig } from './config/config.types';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    // Config loads and validates first — everything else in this module
    // list reads from ConfigService, either directly or via forRootAsync.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      cache: true,
    }),

    LoggerModule,

    // Rate-limiting foundation (Step 7). Applied globally via the
    // APP_GUARD provider below; individual routes can override with
    // @Throttle() (see HealthController for an example).
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttle = configService.get<ThrottleConfig>('throttle')!;
        return {
          throttlers: [{ ttl: throttle.ttlMs, limit: throttle.limit }],
        };
      },
    }),

    DatabaseModule,
    RedisModule,
    StorageModule,

    // The one implemented feature module in Phase 0A — see health.module.ts.
    // Every other future domain (auth, users, universities, faculties,
    // departments, programmes, courses, resources, timetable, rooms,
    // announcements, notifications, search, AI, audit) is intentionally
    // NOT scaffolded here yet; see docs/architecture/module-conventions.md
    // for why and for the pattern each will follow when it's built.
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
