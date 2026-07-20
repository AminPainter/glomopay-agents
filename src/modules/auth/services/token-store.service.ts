import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class TokenStoreService {
  private readonly redis: Redis;
  private static readonly KEY = 'gmail:refresh_token';

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });
  }

  setRefreshToken(token: string): Promise<'OK'> {
    return this.redis.set(TokenStoreService.KEY, token);
  }

  getRefreshToken(): Promise<string | null> {
    return this.redis.get(TokenStoreService.KEY);
  }
}
