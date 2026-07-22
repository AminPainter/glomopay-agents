import { ToolLoopAgent, stepCountIs } from 'ai';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../../../ai/services/ai.service';
import { RegisteredAgent } from '../../services/agent-registry.service';
import { EMPLOYEE_ASSISTANT_SYSTEM_PROMPT } from './employee-assistant.prompt';

export const EMPLOYEE_ASSISTANT = 'employee-assistant';

export const employeeAssistantProvider: Provider = {
  provide: EMPLOYEE_ASSISTANT,
  useFactory: (aiService: AiService, config: ConfigService): RegisteredAgent =>
    new ToolLoopAgent({
      model: aiService.model(),
      instructions: EMPLOYEE_ASSISTANT_SYSTEM_PROMPT,
      tools: aiService.webTools(),
      stopWhen: stepCountIs(Number(config.get('EMPLOYEE_ASSISTANT_MAX_STEPS') ?? 10)),
    }),
  inject: [AiService, ConfigService],
};
