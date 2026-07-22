import { Module } from '@nestjs/common';
import { SlackBotService } from './services/slack-bot.service';
import { SlackWebhookController } from './controllers/slack-webhook.controller';

@Module({
  providers: [SlackBotService],
  controllers: [SlackWebhookController],
})
export class SlackModule {}
