import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private client?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly health: HealthIndicatorService,
  ) {}

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.config.getOrThrow<string>('REDIS_URL'), {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.client.on('error', (err) =>
        this.logger.warn(`redis: ${err.message}`),
      );
    }
    return this.client;
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      const client = this.getClient();
      if (client.status !== 'ready') await client.connect();
      const pong = await client.ping();
      return pong === 'PONG'
        ? indicator.up()
        : indicator.down({ message: 'unexpected ping reply' });
    } catch (err) {
      return indicator.down({
        message: err instanceof Error ? err.message : 'redis unreachable',
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit().catch(() => undefined);
  }
}
