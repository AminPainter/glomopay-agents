import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AgentRegistry, RegisteredAgent } from './services/agent-registry.service';
import {
  EMPLOYEE_ASSISTANT,
  employeeAssistantProvider,
} from './workforce/employee-assistant/employee-assistant.agent';

@Module({
  imports: [AiModule],
  providers: [
    employeeAssistantProvider,
    {
      provide: AgentRegistry,
      useFactory: (employeeAssistant: RegisteredAgent) =>
        new AgentRegistry(new Map([[EMPLOYEE_ASSISTANT, employeeAssistant]])),
      inject: [EMPLOYEE_ASSISTANT],
    },
  ],
  exports: [AgentRegistry],
})
export class AgentsModule {}
