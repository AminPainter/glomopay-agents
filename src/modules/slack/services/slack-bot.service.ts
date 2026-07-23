import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentRegistry } from '../../agents/services/agent-registry.service';
import { EMPLOYEE_ASSISTANT } from '../../agents/workforce/employee-assistant/employee-assistant.agent';

@Injectable()
export class SlackBotService implements OnModuleInit {
  private readonly logger = new Logger(SlackBotService.name);
  private bot!: import('chat').Chat;

  constructor(private readonly agentRegistry: AgentRegistry) {}

  async onModuleInit(): Promise<void> {
    const { Chat } = await import('chat');
    const { createSlackAdapter } = await import('@chat-adapter/slack');
    const { createMemoryState } = await import('@chat-adapter/state-memory');

    this.bot = new Chat({
      userName: 'glomopay-bot',
      adapters: { slack: createSlackAdapter() },
      state: createMemoryState(),
    });

    this.bot.onNewMention(async (thread, message) => {
      this.logger.log(`mention: ${message.text}`);
      const result = await this.agentRegistry
        .get(EMPLOYEE_ASSISTANT)
        .stream({ prompt: message.text });
      await thread.post(result.textStream);
      const text = await result.text;
      if (text.trim().length > 0) {
        this.logger.log(`answered: ${text.length} chars`);
      } else {
        this.logger.warn('agent produced an empty response');
      }
    });
  }

  get slackWebhook() {
    return this.bot.webhooks.slack;
  }
}
