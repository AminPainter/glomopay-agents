import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
