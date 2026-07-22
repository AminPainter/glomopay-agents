import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AssistantService } from './services/assistant.service';

@Module({
  imports: [AiModule],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
