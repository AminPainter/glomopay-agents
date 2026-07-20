import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { GmailIngestionModule } from '../gmail-ingestion/gmail-ingestion.module';
import { SupportAgentModule } from '../support-agent/support-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    AiModule,
    AuthModule,
    GmailIngestionModule,
    SupportAgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
