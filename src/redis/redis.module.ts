import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * @Global so any future feature module (auth sessions, rate limiting,
 * caching, queues) can inject RedisService without re-importing this
 * module — the same application-wide availability Postgres gets from
 * TypeOrmModule.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
