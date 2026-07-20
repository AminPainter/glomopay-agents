import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { TokenStoreService } from './services/token-store.service';

@Controller('auth/google')
export class AuthController {
  constructor(private readonly tokenStore: TokenStoreService) {}

  @Get()
  @UseGuards(GoogleOAuthGuard)
  login(): void {}

  @Get('callback')
  @UseGuards(GoogleOAuthGuard)
  async callback(@Req() req: Request) {
    const user = req.user as { email?: string; refreshToken?: string };
    if (!user?.refreshToken)
      return {
        status: 'no_refresh_token',
        email: user?.email,
        hint: 'Google returned no refresh token — revoke the app at myaccount.google.com/permissions and retry.',
      };

    await this.tokenStore.setRefreshToken(user.refreshToken);
    return { status: 'authorized', email: user.email };
  }
}
