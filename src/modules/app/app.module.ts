import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { AiModule } from '../ai/ai.module';
import { SupportAgentModule } from '../support-agent/support-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: Number(config.getOrThrow<string>('REDIS_PORT')),
        },
      }),
    }),
    AiModule,
    SupportAgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
