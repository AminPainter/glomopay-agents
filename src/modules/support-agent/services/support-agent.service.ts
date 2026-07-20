import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToolLoopAgent, stepCountIs } from 'ai';
import { AiService } from '../../ai/services/ai.service';
import { SUPPORT_SYSTEM_PROMPT } from '../prompts/support-agent.prompt';

@Injectable()
export class SupportAgentService {
  private readonly logger = new Logger(SupportAgentService.name);
  private readonly agent: ReturnType<SupportAgentService['buildAgent']>;

  constructor(
    private readonly aiService: AiService,
    private readonly config: ConfigService,
  ) {
    this.agent = this.buildAgent();
  }

  private buildAgent() {
    const maxSteps = this.config.get<number>('SUPPORT_AGENT_MAX_STEPS', 12);

    return new ToolLoopAgent({
      model: this.aiService.model(),
      instructions: SUPPORT_SYSTEM_PROMPT,
      stopWhen: stepCountIs(maxSteps),
    });
  }

  async draftReply(message: string): Promise<string> {
    const { text } = await this.agent.generate({ prompt: message });

    this.logger.log(`drafted reply:\n${text}`);
    return text;
  }
}
