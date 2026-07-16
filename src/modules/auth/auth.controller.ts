import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TokenStoreService } from './services/token-store.service';

@Controller('auth/google')
export class AuthController {
  constructor(private readonly tokenStore: TokenStoreService) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  login(): void {}

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async callback(@Req() req: Request) {
    const user = req.user as { email?: string; refreshToken?: string };
    if (user?.refreshToken) {
      await this.tokenStore.setRefreshToken(user.refreshToken);
    }
    return { status: 'authorized', email: user?.email };
  }
}
