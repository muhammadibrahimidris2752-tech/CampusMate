import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Throttle } from '@nestjs/throttler';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

/**
 * The one fully-implemented feature in Phase 0A. Deliberately kept real
 * rather than a placeholder, for two reasons: it's genuinely needed
 * infrastructure (Step 11 requires testing DB/Redis connectivity, and this
 * is how an orchestrator/load balancer would check the service is up),
 * and it doubles as the reference example for how every future module
 * under src/modules/** should be shaped — see
 * docs/architecture/module-conventions.md.
 *
 * Reachable at GET /api/v1/health once the global prefix + versioning in
 * main.ts are applied.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  // A generous but real limit — this endpoint is meant to be polled
  // frequently by orchestration/load balancers, just not unboundedly.
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
