import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class TokenStoreService {
  private readonly redis: Redis;
  private static readonly KEY = 'gmail:refresh_token';

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.getOrThrow<string>('REDIS_HOST'),
      port: Number(this.config.getOrThrow<string>('REDIS_PORT')),
    });
  }

  setRefreshToken(token: string): Promise<'OK'> {
    return this.redis.set(TokenStoreService.KEY, token);
  }

  getRefreshToken(): Promise<string | null> {
    return this.redis.get(TokenStoreService.KEY);
  }
}
