import { Module } from '@nestjs/common';
import { AssistantModule } from '../assistant/assistant.module';
import { SlackBotService } from './services/slack-bot.service';
import { SlackWebhookController } from './controllers/slack-webhook.controller';

@Module({
  imports: [AssistantModule],
  providers: [SlackBotService],
  controllers: [SlackWebhookController],
})
export class SlackModule {}
