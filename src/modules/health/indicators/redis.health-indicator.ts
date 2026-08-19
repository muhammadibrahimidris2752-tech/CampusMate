import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from '../../../redis/redis.service';

/**
 * @nestjs/terminus ships a Postgres/TypeORM indicator out of the box but
 * not one for ioredis, so this is a small custom indicator following the
 * same Terminus pattern (extend HealthIndicator, throw HealthCheckError
 * on failure) — see health.controller.ts.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isUp = await this.redisService.ping();
    const result = this.getStatus(key, isUp);

    if (isUp) {
      return result;
    }

    throw new HealthCheckError('Redis health check failed', result);
  }
}
