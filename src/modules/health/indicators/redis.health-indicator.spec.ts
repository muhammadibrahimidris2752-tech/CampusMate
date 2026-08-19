import { HealthCheckError } from '@nestjs/terminus';
import { RedisService } from '../../../redis/redis.service';
import { RedisHealthIndicator } from './redis.health-indicator';

describe('RedisHealthIndicator', () => {
  function buildIndicator(pingResult: boolean): RedisHealthIndicator {
    const redisService = {
      ping: jest.fn().mockResolvedValue(pingResult),
    } as unknown as RedisService;
    return new RedisHealthIndicator(redisService);
  }

  it('reports healthy when Redis responds to ping', async () => {
    const indicator = buildIndicator(true);
    const result = await indicator.isHealthy('redis');
    expect(result.redis.status).toBe('up');
  });

  it('throws a HealthCheckError when Redis does not respond', async () => {
    const indicator = buildIndicator(false);
    await expect(indicator.isHealthy('redis')).rejects.toThrow(HealthCheckError);
  });
});
