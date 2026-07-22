import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToolLoopAgent, stepCountIs } from 'ai';
import { AiService } from '../../ai/services/ai.service';
import { ASSISTANT_SYSTEM_PROMPT } from '../prompts/assistant.prompt';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly agent: ReturnType<AssistantService['buildAgent']>;

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
      instructions: ASSISTANT_SYSTEM_PROMPT,
      tools: this.aiService.webTools(),
      stopWhen: stepCountIs(maxSteps),
    });
  }

  // Returns the stream result; the caller pipes result.textStream into the reply
  // and can await result.text for the full answer once streaming completes.
  // Edge case to revisit: if the agent ends its final step on a tool call with no
  // trailing text, the stream is empty and nothing is posted.
  answer(query: string) {
    this.logger.log(`answering: ${query}`);
    return this.agent.stream({ prompt: query });
  }
}
