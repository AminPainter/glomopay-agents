import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AgentRegistry } from './services/agent-registry.service';
import { AgentsBootstrapService } from './services/agents-bootstrap.service';

@Module({
  imports: [AiModule],
  providers: [AgentRegistry, AgentsBootstrapService],
  exports: [AgentRegistry],
})
export class AgentsModule {}
