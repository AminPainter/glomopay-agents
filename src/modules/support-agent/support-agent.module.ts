import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SupportAgentService } from './services/support-agent.service';

@Module({
  imports: [AiModule],
  providers: [SupportAgentService],
  exports: [SupportAgentService],
})
export class SupportAgentModule {}
