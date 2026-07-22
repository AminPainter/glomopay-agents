import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SlackBotService implements OnModuleInit {
  private readonly logger = new Logger(SlackBotService.name);
  private bot!: import('chat').Chat;

  async onModuleInit(): Promise<void> {
    const { Chat } = await import('chat');
    const { createSlackAdapter } = await import('@chat-adapter/slack');
    const { createMemoryState } = await import('@chat-adapter/state-memory');

    this.bot = new Chat({
      userName: 'glomopay-bot',
      adapters: { slack: createSlackAdapter() },
      state: createMemoryState(),
    });

    this.bot.onNewMention(() => {
      this.logger.log('Bot was mentioned in Slack');
    });
  }

  get slackWebhook() {
    return this.bot.webhooks.slack;
  }
}
