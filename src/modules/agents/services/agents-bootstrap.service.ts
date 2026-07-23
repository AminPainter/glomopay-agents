import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../../ai/services/ai.service';
import { SentryMcpService } from '../../ai/services/sentry-mcp.service';
import { AgentRegistry } from './agent-registry.service';
import {
  EMPLOYEE_ASSISTANT,
  createEmployeeAssistant,
} from '../workforce/employee-assistant/employee-assistant.agent';

@Injectable()
export class AgentsBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly aiService: AiService,
    private readonly sentryMcpService: SentryMcpService,
    private readonly configService: ConfigService,
    private readonly agentRegistry: AgentRegistry,
  ) {}

  onApplicationBootstrap(): void {
    this.agentRegistry.register(
      EMPLOYEE_ASSISTANT,
      createEmployeeAssistant(this.aiService, this.sentryMcpService, this.configService),
    );
  }
}
