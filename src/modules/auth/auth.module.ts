import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { TokenStoreService } from './services/token-store.service';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [GoogleStrategy, TokenStoreService],
  exports: [TokenStoreService],
})
export class AuthModule {}
