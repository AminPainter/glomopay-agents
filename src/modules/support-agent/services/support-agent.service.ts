import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateText, stepCountIs } from 'ai';
import { AiService } from '../../ai/services/ai.service';
import { SUPPORT_SYSTEM_PROMPT } from '../prompts/support-agent.prompt';

@Injectable()
export class SupportAgentService {
  private readonly logger = new Logger(SupportAgentService.name);
  private readonly maxSteps: number;
  private readonly docsDomain: string;

  constructor(
    private readonly aiService: AiService,
    private readonly config: ConfigService,
  ) {
    this.maxSteps = this.config.get<number>('SUPPORT_AGENT_MAX_STEPS', 12);
    this.docsDomain = this.config.get<string>(
      'SUPPORT_AGENT_DOCS_DOMAIN',
      'docs.glomopay.com',
    );
  }

  async draftReply(message: string): Promise<string> {
    const { text } = await generateText({
      model: this.aiService.model(),
      system: SUPPORT_SYSTEM_PROMPT,
      prompt: message,
      tools: this.aiService.webTools(this.docsDomain),
      stopWhen: stepCountIs(this.maxSteps),
    });

    this.logger.log(`drafted reply:\n${text}`);
    return text;
  }
}
