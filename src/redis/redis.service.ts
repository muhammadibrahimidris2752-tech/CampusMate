import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '../config/config.types';

/**
 * Redis foundation (Step 5).
 *
 * Redis is cache / rate-limit-store / future-queue infrastructure — NOT
 * the source of truth (that's Postgres). That distinction shapes the one
 * important design decision here: a Redis outage at boot does not crash
 * the process or block startup. The client retries in the background and
 * `/api/v1/health` (Step 11) is the mechanism that surfaces a down Redis
 * to operators/orchestration, rather than the app refusing to serve any
 * traffic at all because a cache is unavailable.
 *
 * This service intentionally stays a thin client wrapper. It does not add
 * caching to anything itself — "do not add unnecessary caching to every
 * endpoint" (Step 5) — later phases build cache-aside logic, rate-limit
 * storage, and queues (BullMQ is ioredis-compatible) on top of it.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get<RedisConfig>('redis')!;

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      tls: redisConfig.tls ? {} : undefined,
      keyPrefix: redisConfig.keyPrefix,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (attempt: number) => Math.min(attempt * 200, 2000),
    });

    // ioredis emits 'error' as a plain EventEmitter event. With no
    // listener attached, an emitted error crashes the Node process — this
    // listener is required, not optional polish.
    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis client error: ${err.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Redis connected');
    } catch (err) {
      this.logger.error(
        `Redis unavailable at startup — continuing without it, will keep retrying in the background: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  /** Escape hatch for future modules that need the raw ioredis client (e.g. BullMQ). */
  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
