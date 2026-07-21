import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToolLoopAgent, generateText, stepCountIs } from 'ai';
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
    const maxSteps = Number(
      this.config.getOrThrow<string>('SUPPORT_AGENT_MAX_STEPS'),
    );

    return new ToolLoopAgent({
      model: this.aiService.model(),
      instructions: SUPPORT_SYSTEM_PROMPT,
      tools: this.aiService.webTools(),
      stopWhen: stepCountIs(maxSteps),
    });
  }

  async draftReply(message: string): Promise<string> {
    const result = await this.agent.generate({ prompt: message });
    let text = result.text.trim();

    // Agent spent its last step on a tool call and never wrote a reply; force one with tools off.
    if (!text) {
      const finalized = await generateText({
        model: this.aiService.model(),
        system: SUPPORT_SYSTEM_PROMPT,
        tools: this.aiService.webTools(),
        toolChoice: 'none',
        messages: [
          { role: 'user', content: message },
          ...result.response.messages,
          {
            role: 'user',
            content:
              'Write the final reply to the customer now, using the information gathered above.',
          },
        ],
      });
      text = finalized.text.trim();
    }

    this.logger.log(`drafted reply:\n${text}`);
    return text;
  }
}
