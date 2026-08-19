import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

/**
 * No RedisModule import here on purpose — it's @Global() (see
 * redis/redis.module.ts) and already loaded once from AppModule, so
 * RedisService is injectable anywhere, including into
 * RedisHealthIndicator below, without re-importing it per module.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
